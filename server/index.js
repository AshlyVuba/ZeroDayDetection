import { createServer } from "node:http";
import { isIP } from "node:net";
import { readFile, realpath } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dispatchAnalysisRequest } from "../src/engine/analysis-dispatch.ts";
import { isAnalysisRequest } from "../src/engine/worker-contract.ts";
import { cleanRecentRisk } from "../src/engine/recent-risk.ts";

export const MAX_REQUEST_BYTES = 20 * 1024;
export const MAX_MESSAGE_CHARACTERS = 5_000;
const GENERIC_ERROR = "The request could not be checked.";
const DEFAULT_STATIC_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self'; form-action 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...SECURITY_HEADERS,
  });
  response.end(JSON.stringify(payload));
}

function normalizeAddress(address) {
  const normalized = address.toLowerCase();
  return normalized.startsWith("::ffff:") && isIP(normalized.slice(7)) === 4
    ? normalized.slice(7)
    : normalized;
}

function parseTrustedProxies(value) {
  if (value === undefined || value.trim() === "") return new Set();
  const addresses = value.split(",").map((address) => address.trim());
  if (addresses.some((address) => isIP(address) === 0)) {
    throw new Error("TRUSTED_PROXIES must contain comma-separated IPv4 or IPv6 addresses.");
  }
  return new Set(addresses.map(normalizeAddress));
}

export function getClientAddress(remoteAddress, forwardedFor, trustedProxies) {
  const peerAddress =
    typeof remoteAddress === "string" ? normalizeAddress(remoteAddress) : "unknown";
  if (!trustedProxies.has(peerAddress) || typeof forwardedFor !== "string") {
    return peerAddress;
  }

  const forwardedAddress = forwardedFor.trim();
  return isIP(forwardedAddress) === 0
    ? peerAddress
    : normalizeAddress(forwardedAddress);
}

function getRequestPath(requestUrl) {
  if (typeof requestUrl !== "string") return null;
  const rawPath = requestUrl.split(/[?#]/u, 1)[0];
  if (!rawPath.startsWith("/")) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (
    decodedPath.includes("\\") ||
    decodedPath.includes("\0") ||
    decodedPath.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return null;
  }
  return decodedPath;
}

function isBrowserNavigation(request) {
  const acceptsHtml = (request.headers.accept ?? "")
    .split(",")
    .some((contentType) => contentType.trim().split(";", 1)[0] === "text/html");
  const navigation =
    request.headers["sec-fetch-mode"] === "navigate" ||
    request.headers["sec-fetch-dest"] === "document";
  return acceptsHtml && navigation;
}

function cacheControlFor(pathname) {
  if (
    pathname === "/index.html" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    /^\/workbox-[^/]+\.js$/u.test(pathname)
  ) {
    return "no-cache";
  }
  if (/-[A-Za-z0-9_-]{8,}\.[^/.]+$/u.test(pathname)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=0, must-revalidate";
}

async function tryReadStaticFile(staticDirectory, pathname) {
  const root = resolve(staticDirectory);
  const filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return null;
  }
  try {
    const [realRoot, realFile] = await Promise.all([realpath(root), realpath(filePath)]);
    if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${sep}`)) {
      return null;
    }
    return await readFile(realFile);
  } catch (error) {
    if (
      error.code === "ENOENT" ||
      error.code === "ENOTDIR" ||
      error.code === "EISDIR"
    ) {
      return null;
    }
    throw error;
  }
}

function sendStatic(response, request, pathname, content) {
  response.writeHead(200, {
    "content-type": MIME_TYPES[extname(pathname).toLowerCase()] ?? "application/octet-stream",
    "cache-control": cacheControlFor(pathname),
    ...SECURITY_HEADERS,
  });
  response.end(request.method === "HEAD" ? undefined : content);
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let byteLength = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;
      byteLength += chunk.length;
      if (byteLength > MAX_REQUEST_BYTES) {
        settled = true;
        rejectBody(413);
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        rejectBody(400);
      }
    });
    request.on("error", () => {
      if (settled) return;
      settled = true;
      rejectBody(400);
    });
  });
}

export function createApiServer(options = {}) {
  const now = options.now ?? Date.now;
  const rateLimit = options.rateLimit ?? 60;
  const trustedProxies =
    options.trustedProxies === undefined
      ? parseTrustedProxies(process.env.TRUSTED_PROXIES)
      : new Set([...options.trustedProxies].map(normalizeAddress));
  const staticDirectory = options.staticDirectory ?? DEFAULT_STATIC_DIRECTORY;
  const requestsByAddress = new Map();

  function isRateLimited(address) {
    const currentTime = now();
    const requests = (requestsByAddress.get(address) ?? []).filter(
      (timestamp) => currentTime - timestamp < 60_000,
    );
    if (requests.length >= rateLimit) {
      requestsByAddress.set(address, requests);
      return true;
    }
    requests.push(currentTime);
    requestsByAddress.set(address, requests);
    return false;
  }

  const limiterCleanup = setInterval(() => {
    const currentTime = now();
    for (const [address, timestamps] of requestsByAddress) {
      const recent = timestamps.filter(
        (timestamp) => currentTime - timestamp < 60_000,
      );
      if (recent.length === 0) requestsByAddress.delete(address);
      else requestsByAddress.set(address, recent);
    }
  }, 60_000);
  limiterCleanup.unref();

  const server = createServer(async (request, response) => {
    const pathname = getRequestPath(request.url);
    if (pathname === null) {
      send(response, 404, { error: GENERIC_ERROR });
      return;
    }

    if (request.method === "GET" && pathname === "/api/health") {
      send(response, 200, { ok: true });
      return;
    }

    const kindByPath = {
      "/api/message/analyse": "message",
      "/api/transaction/analyse": "transaction",
    };
    const kind = kindByPath[pathname];
    if (request.method !== "POST" || kind === undefined) {
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        send(response, 404, { error: GENERIC_ERROR });
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 404, { error: GENERIC_ERROR });
        return;
      }

      const staticPath = pathname === "/" ? "/index.html" : pathname;
      try {
        const content = await tryReadStaticFile(staticDirectory, staticPath);
        if (content !== null) {
          sendStatic(response, request, staticPath, content);
          return;
        }
        if (pathname !== "/" && isBrowserNavigation(request)) {
          const index = await tryReadStaticFile(staticDirectory, "/index.html");
          if (index !== null) {
            sendStatic(response, request, "/index.html", index);
            return;
          }
        }
      } catch {
        send(response, 500, { error: GENERIC_ERROR });
        return;
      }
      send(response, 404, { error: GENERIC_ERROR });
      return;
    }

    const clientAddress = getClientAddress(
      request.socket.remoteAddress,
      request.headers["x-forwarded-for"],
      trustedProxies,
    );
    if (isRateLimited(clientAddress)) {
      send(response, 429, { error: GENERIC_ERROR });
      request.resume();
      return;
    }

    if (!/^application\/json(?:\s*;|$)/iu.test(request.headers["content-type"] ?? "")) {
      send(response, 415, { error: GENERIC_ERROR });
      request.resume();
      return;
    }

    let body;
    try {
      body = await readJsonBody(request);
    } catch (status) {
      send(response, status === 413 ? 413 : 400, { error: GENERIC_ERROR });
      return;
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      send(response, 400, { error: GENERIC_ERROR });
      return;
    }

    const validMessage =
      kind !== "message" ||
      (typeof body.text === "string" &&
        body.text.trim().length > 0 &&
        body.text.length <= MAX_MESSAGE_CHARACTERS);
    if (!validMessage || !isAnalysisRequest({ kind, payload: body })) {
      send(response, 400, { error: GENERIC_ERROR });
      return;
    }

    let result;
    try {
      if (kind === "message") {
        result = dispatchAnalysisRequest({
          kind,
          payload: { text: body.text, lang: body.lang ?? "en" },
        });
      } else {
        const recentMessage = cleanRecentRisk(body.recentMessage, now());
        result = dispatchAnalysisRequest({
          kind,
          payload: {
            transaction: body.transaction,
            history: body.history,
            ...(recentMessage === undefined ? {} : { recentMessage }),
          },
        });
      }
    } catch {
      send(response, 400, { error: GENERIC_ERROR });
      return;
    }
    send(response, 200, result);
  });
  server.on("close", () => clearInterval(limiterCleanup));
  return server;
}

function startServer() {
  const port = Number(process.env.PORT ?? 3000);
  const server = createApiServer();
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`ZeroDay API listening on port ${port}\n`);
  });
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  startServer();
}