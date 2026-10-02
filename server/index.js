import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { analyseTransaction } from "../src/engine/transaction.ts";
import { explain } from "../src/engine/explain.ts";
import { analyseMessage } from "../src/engine/message.ts";
import { isAnalysisRequest } from "../src/engine/worker-contract.ts";
import { cleanRecentRisk } from "../src/engine/recent-risk.ts";

export const MAX_REQUEST_BYTES = 20 * 1024;
export const MAX_MESSAGE_CHARACTERS = 5_000;
const GENERIC_ERROR = "The request could not be checked.";

function send(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(payload));
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
    if (request.method === "GET" && request.url === "/api/health") {
      send(response, 200, { ok: true });
      return;
    }

    const kindByPath = {
      "/api/message/analyse": "message",
      "/api/transaction/analyse": "transaction",
    };
    const kind = request.url === undefined ? undefined : kindByPath[request.url];
    if (request.method !== "POST" || kind === undefined) {
      send(response, 404, { error: GENERIC_ERROR });
      return;
    }

    if (isRateLimited(request.socket.remoteAddress ?? "unknown")) {
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

    const language = kind === "message" ? body.lang ?? "en" : "en";
    let result;
    try {
      if (kind === "message") {
        result = analyseMessage(body.text, language);
      } else {
        const recentMessage = cleanRecentRisk(body.recentMessage, now());
        result = analyseTransaction(
          body.transaction,
          body.history,
          recentMessage,
        );
      }
    } catch {
      send(response, 400, { error: GENERIC_ERROR });
      return;
    }
    send(response, 200, {
      ...result,
      explanation: explain(result, language),
    });
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