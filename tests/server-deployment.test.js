import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiServer, getClientAddress } from "../server/index.js";

const fixtureServerDirectory = await mkdtemp(join(tmpdir(), "zeroday-server-"));
const fixtureAssetsDirectory = join(fixtureServerDirectory, "assets");
await mkdir(fixtureAssetsDirectory);
await writeFile(join(fixtureServerDirectory, "index.html"), "<main>app shell</main>");
await writeFile(join(fixtureAssetsDirectory, "app-0123456789abcdef.js"), "export {};");
await writeFile(join(fixtureServerDirectory, "sw.js"), "self.skipWaiting();");
await writeFile(
  join(fixtureServerDirectory, "manifest.webmanifest"),
  JSON.stringify({ name: "Fixture app" }),
);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("The test server did not start."));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function getRawPath(url, path) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path,
        method: "GET",
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function analyse(url, forwardedFor) {
  return fetch(`${url}/api/message/analyse`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor }),
    },
    body: JSON.stringify({ text: "hello" }),
  });
}

describe("production app server", () => {
  let staticServer;
  let staticUrl;

  beforeAll(async () => {
    staticServer = createApiServer({ staticDirectory: fixtureServerDirectory });
    staticUrl = await listen(staticServer);
  });

  afterAll(async () => {
    await close(staticServer);
  });

  it("serves the app shell with strict CSP and revalidation", async () => {
    const response = await fetch(staticUrl);
    const body = await response.text();
    const deployedHeaders = await readFile(
      new URL("../public/_headers", import.meta.url),
      "utf8",
    );
    const csp = deployedHeaders.match(/Content-Security-Policy:\s*(.+)/u)?.[1];

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("content-security-policy")).toBe(csp);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body).toContain("app shell");
  });

  it("uses immutable caching only for hashed assets", async () => {
    const hashedAsset = await fetch(`${staticUrl}/assets/app-0123456789abcdef.js`);
    const serviceWorker = await fetch(`${staticUrl}/sw.js`);
    const manifest = await fetch(`${staticUrl}/manifest.webmanifest`);

    expect(hashedAsset.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(hashedAsset.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(serviceWorker.headers.get("cache-control")).toBe("no-cache");
    expect(manifest.headers.get("content-type")).toBe("application/manifest+json");
    expect(manifest.headers.get("cache-control")).toBe("no-cache");
  });

  it("uses SPA fallback only for browser document navigation", async () => {
    const navigation = await fetch(`${staticUrl}/history`, {
      headers: {
        accept: "text/html",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      },
    });
    const htmlFetch = await fetch(`${staticUrl}/missing`, {
      headers: { accept: "text/html" },
    });
    const apiNavigation = await fetch(`${staticUrl}/api/missing`, {
      headers: {
        accept: "text/html",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      },
    });

    expect(navigation.status).toBe(200);
    await expect(navigation.text()).resolves.toContain("app shell");
    expect(htmlFetch.status).toBe(404);
    expect(apiNavigation.status).toBe(404);
  });

  it("rejects encoded traversal paths", async () => {
    expect(await getRawPath(staticUrl, "/%2e%2e/server.js")).toBe(404);
  });
});

describe("rate-limit client identity", () => {
  it("ignores forwarded addresses from an untrusted direct client", async () => {
    const server = createApiServer({ rateLimit: 2, trustedProxies: new Set() });
    const url = await listen(server);
    try {
      expect((await analyse(url, "192.0.2.10")).status).toBe(200);
      expect((await analyse(url, "192.0.2.11")).status).toBe(200);
      expect((await analyse(url, "192.0.2.12")).status).toBe(429);
    } finally {
      await close(server);
    }
  });

  it("honors one forwarded address only from an explicitly trusted peer", async () => {
    const server = createApiServer({
      rateLimit: 2,
      trustedProxies: new Set(["127.0.0.1"]),
    });
    const url = await listen(server);
    try {
      expect((await analyse(url, "192.0.2.10")).status).toBe(200);
      expect((await analyse(url, "192.0.2.10")).status).toBe(200);
      expect((await analyse(url, "192.0.2.11")).status).toBe(200);
      expect((await analyse(url, "192.0.2.11")).status).toBe(200);
      expect((await analyse(url, "192.0.2.10")).status).toBe(429);
    } finally {
      await close(server);
    }
  });

  it("supports IPv4 and IPv6 addresses and rejects ambiguous forwarded chains", () => {
    expect(
      getClientAddress(
        "::ffff:127.0.0.1",
        "192.0.2.10",
        new Set(["127.0.0.1"]),
      ),
    ).toBe("192.0.2.10");
    expect(
      getClientAddress(
        "2001:db8::1",
        "2001:db8::10",
        new Set(["2001:db8::1"]),
      ),
    ).toBe("2001:db8::10");
    expect(
      getClientAddress(
        "2001:db8::1",
        "2001:db8::10, 2001:db8::11",
        new Set(["2001:db8::1"]),
      ),
    ).toBe("2001:db8::1");
    expect(
      getClientAddress(
        "2001:db8::2",
        "2001:db8::10",
        new Set(["2001:db8::1"]),
      ),
    ).toBe("2001:db8::2");
  });
});

afterAll(async () => {
  await rm(fixtureServerDirectory, { recursive: true, force: true });
});
