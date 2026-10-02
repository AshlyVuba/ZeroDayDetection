import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApiServer } from "../server/index.js";

const server = createApiServer();
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The API test server did not start.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe("stateless analysis API", () => {
  it("returns the health contract", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns a scored result, signals, and explanation", async () => {
    const response = await fetch(`${baseUrl}/api/message/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "Please send your password so I can verify the account.",
        lang: "en",
      }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      score: 80,
      band: "high",
      signals: [expect.objectContaining({ id: "CREDENTIAL_REQUEST" })],
      explanation: {
        headline: "Pause. Do not pay or share codes yet.",
        reasons: [expect.stringContaining("password, PIN, or one-time code")],
        nextSteps: [expect.any(String)],
      },
    });
  });

  it.each([
    ["empty text", { text: "   " }, 400],
    ["text over the character limit", { text: "x".repeat(5_001) }, 400],
    ["unsupported language", { text: "hello", lang: "xx" }, 400],
    ["unexpected field", { text: "hello", messageBody: "do not accept" }, 400],
  ])("rejects %s with a generic error", async (_name, body, status) => {
    const response = await fetch(`${baseUrl}/api/message/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(status);
    const error = await response.json();
    expect(error).toEqual({ error: "The request could not be checked." });
    expect(JSON.stringify(error)).not.toContain("x".repeat(50));
  });

  it("rejects bodies over 20 KB", async () => {
    const response = await fetch(`${baseUrl}/api/message/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(20 * 1024) }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "The request could not be checked.",
    });
  });

  it("rejects a non-JSON content type", async () => {
    const response = await fetch(`${baseUrl}/api/message/analyse`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "text",
    });

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({
      error: "The request could not be checked.",
    });
  });

  it("rejects malformed JSON and unknown routes", async () => {
    const malformed = await fetch(`${baseUrl}/api/message/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const unknown = await fetch(`${baseUrl}/api/unknown`);

    expect(malformed.status).toBe(400);
    expect(unknown.status).toBe(404);
  });

  it.each([
    ["unsupported currency", { amount: 450, currency: "XYZ" }],
    ["negative amount", { amount: -1, currency: "ZAR" }],
  ])("rejects a payment with %s", async (_name, changes) => {
    const response = await fetch(`${baseUrl}/api/transaction/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transaction: {
          id: "tx-current",
          recipientId: "recipient-new",
          timestamp: Date.now(),
          ...changes,
        },
        history: [],
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The request could not be checked.",
    });
  });

  it("cross-signals a recent high-risk message without accepting its text", async () => {
    const timestamp = Date.now();
    const response = await fetch(`${baseUrl}/api/transaction/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transaction: {
          id: "tx-current",
          recipientId: "recipient-new",
          amount: 450,
          currency: "ZAR",
          timestamp,
        },
        history: [],
        recentMessage: {
          band: "high",
          scamType: "job_scam",
          timestamp: timestamp - 20 * 60_000,
        },
      }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.band).toBe("high");
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "RECENT_RISKY_MESSAGE" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("messageText");
  });

  it("drops expired recent-risk records and rejects records containing message text", async () => {
    const timestamp = Date.now();
    const payment = {
      transaction: {
        id: "tx-current",
        recipientId: "recipient-new",
        amount: 450,
        currency: "ZAR",
        timestamp,
      },
      history: [],
    };
    const expired = await fetch(`${baseUrl}/api/transaction/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payment,
        recentMessage: {
          band: "high",
          scamType: "job_scam",
          timestamp: timestamp - 25 * 60 * 60_000,
        },
      }),
    });
    const expiredResult = await expired.json();
    const withText = await fetch(`${baseUrl}/api/transaction/analyse`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payment,
        recentMessage: {
          band: "high",
          scamType: "job_scam",
          timestamp,
          text: "This must not be accepted",
        },
      }),
    });

    expect(expired.status).toBe(200);
    expect(expiredResult.signals).not.toContainEqual(
      expect.objectContaining({ id: "RECENT_RISKY_MESSAGE" }),
    );
    expect(withText.status).toBe(400);
  });

  it("returns 404 for traversal paths and does not log submitted text", async () => {
    const stdout = (
      globalThis as unknown as {
        process: { stdout: { write: (...args: unknown[]) => unknown } };
      }
    ).process.stdout;
    const writeSpy = vi.spyOn(stdout, "write");
    try {
      const traversal = await fetch(`${baseUrl}/%2e%2e/server.js`);
      await fetch(`${baseUrl}/api/message/analyse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "private message text" }),
      });

      expect(traversal.status).toBe(404);
      expect(writeSpy).not.toHaveBeenCalled();
    } finally {
      writeSpy.mockRestore();
    }
  });

  it("returns 429 on the 61st request in one minute", async () => {
    const limitedServer = createApiServer();
    await new Promise<void>((resolve) =>
      limitedServer.listen(0, "127.0.0.1", resolve),
    );
    const address = limitedServer.address();
    if (address === null || typeof address === "string") {
      throw new Error("The rate-limit test server did not start.");
    }
    const limitedUrl = `http://127.0.0.1:${address.port}`;
    try {
      for (let request = 0; request < 60; request += 1) {
        const response = await fetch(`${limitedUrl}/api/message/analyse`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: "hello" }),
        });
        expect(response.status).toBe(200);
      }
      const blocked = await fetch(`${limitedUrl}/api/message/analyse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });

      expect(blocked.status).toBe(429);
    } finally {
      await new Promise<void>((resolve, reject) =>
        limitedServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});