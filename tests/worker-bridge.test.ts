import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnalysisRequest } from "../src/engine/analysis-dispatch";
import {
  ANALYSIS_FAILURE_MESSAGE,
  runAnalysis,
  type AnalysisRequest,
  type AnalysisWorker,
} from "../src/engine/worker-bridge";

const riskResult = dispatchAnalysisRequest({
  kind: "message",
  payload: { text: "Please act now. Visit https://capitac.co.za" },
});

class FakeWorker implements AnalysisWorker {
  onmessage: AnalysisWorker["onmessage"] = null;
  onerror: AnalysisWorker["onerror"] = null;
  onmessageerror: AnalysisWorker["onmessageerror"] = null;
  postedRequest: AnalysisRequest | undefined;
  terminateCount = 0;
  response: unknown;
  respondOnPost = true;
  errorOnPost = false;

  postMessage(request: AnalysisRequest): void {
    this.postedRequest = request;
    if (this.errorOnPost) {
      this.onerror?.(new ErrorEvent("error"));
    } else if (this.respondOnPost) {
      this.onmessage?.(new MessageEvent("message", { data: this.response }));
    }
  }

  terminate(): void {
    this.terminateCount += 1;
  }
}

describe("runAnalysis", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends a discriminated plain request and returns a validated result", async () => {
    const worker = new FakeWorker();
    worker.response = riskResult;

    const outcome = await runAnalysis(
      "message",
      { text: "Please act now." },
      { createWorker: () => worker },
    );

    expect(worker.postedRequest).toEqual({
      kind: "message",
      payload: { text: "Please act now." },
    });
    expect(outcome).toEqual({ status: "success", result: riskResult });
    expect(worker.terminateCount).toBe(1);
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
    expect(worker.onmessageerror).toBeNull();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(worker.terminateCount).toBe(1);
  });

  it("returns the safe failure outcome on a worker error", async () => {
    const worker = new FakeWorker();
    worker.errorOnPost = true;

    await expect(
      runAnalysis(
        "message",
        { text: "private input" },
        { createWorker: () => worker },
      ),
    ).resolves.toEqual({
      status: "failure",
      message: ANALYSIS_FAILURE_MESSAGE,
    });
    expect(worker.terminateCount).toBe(1);
  });

  it("rejects malformed worker messages without echoing input", async () => {
    const worker = new FakeWorker();
    worker.response = { ...riskResult, score: "private input" };

    await expect(
      runAnalysis(
        "message",
        { text: "private input" },
        { createWorker: () => worker },
      ),
    ).resolves.toEqual({
      status: "failure",
      message: "We couldn't check this. Be careful and verify.",
    });
    expect(worker.terminateCount).toBe(1);
  });

  it("fails after three seconds and terminates the worker", async () => {
    const worker = new FakeWorker();
    worker.respondOnPost = false;

    const pending = runAnalysis(
      "message",
      { text: "sample" },
      { createWorker: () => worker },
    );
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(pending).resolves.toEqual({
      status: "failure",
      message: ANALYSIS_FAILURE_MESSAGE,
    });
    expect(worker.terminateCount).toBe(1);
    expect(worker.onmessage).toBeNull();
  });

  it("does not create a worker for a non-plain payload", async () => {
    const createWorker = vi.fn(() => new FakeWorker());
    const payload = { text: "sample", extra: () => "not cloneable" };

    await expect(
      runAnalysis("message", payload, { createWorker }),
    ).resolves.toEqual({
      status: "failure",
      message: ANALYSIS_FAILURE_MESSAGE,
    });
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("uses a separate worker for each concurrent call", async () => {
    const workers = [new FakeWorker(), new FakeWorker()];
    workers[0].response = riskResult;
    workers[1].response = dispatchAnalysisRequest({
      kind: "message",
      payload: { text: "hello" },
    });
    let nextWorker = 0;

    const outcomes = await Promise.all([
      runAnalysis("message", { text: "first" }, {
        createWorker: () => workers[nextWorker++],
      }),
      runAnalysis("message", { text: "second" }, {
        createWorker: () => workers[nextWorker++],
      }),
    ]);

    expect(outcomes).toEqual([
      { status: "success", result: riskResult },
      {
        status: "success",
        result: dispatchAnalysisRequest({
          kind: "message",
          payload: { text: "hello" },
        }),
      },
    ]);
    expect(workers.map((worker) => worker.postedRequest?.payload)).toEqual([
      { text: "first" },
      { text: "second" },
    ]);
    expect(workers.map((worker) => worker.terminateCount)).toEqual([1, 1]);
  });
});

describe("analysis worker dispatch", () => {
  it("returns the message analyzer's risk result and shared explanation", () => {
    expect(
      dispatchAnalysisRequest({
        kind: "message",
        payload: { text: "Please send your password so I can verify." },
      }),
    ).toMatchObject({
      score: 80,
      band: "high",
      signals: [expect.objectContaining({ id: "CREDENTIAL_REQUEST" })],
      explanation: {
        headline: "Several signs raised concern",
        reasons: [
          "The message appears to request a password, PIN, or one-time code.",
        ],
      },
    });
  });

  it("includes order-scam classification and tailored guidance in worker output", () => {
    expect(
      dispatchAnalysisRequest({
        kind: "message",
        payload: {
          text: "Create a Mukuru order on my behalf using your account.",
        },
      }),
    ).toMatchObject({
      band: "high",
      scamType: "mule_request",
      signals: [expect.objectContaining({ id: "CREATE_ORDER_FOR_THEM" })],
      explanation: {
        nextSteps: [
          "Do not place orders or move money for someone else.",
          "Do not share your account, payment, or identity details.",
          "If you already placed an order or moved money, contact the provider or your bank through a known channel.",
        ],
      },
    });
  });

  it("rejects invalid worker requests", () => {
    expect(() =>
      dispatchAnalysisRequest({
        kind: "message",
        payload: { text: "sample", lang: "unknown" },
      }),
    ).toThrow("Invalid analysis request");
  });

  it("accepts transaction analysis payloads and includes an explanation", () => {
    const transactionTimestamp = new Date(2025, 0, 15, 12).getTime();

    expect(
      dispatchAnalysisRequest({
        kind: "transaction",
        payload: {
          transaction: {
            id: "tx-1",
            recipientId: "recipient-1",
            amount: 101,
            currency: "ZAR",
            timestamp: transactionTimestamp,
          },
          history: [
            {
              id: "tx-0",
              recipientId: "recipient-1",
              amount: 101,
              currency: "ZAR",
              timestamp: new Date(2025, 0, 15, 11).getTime(),
            },
          ],
        },
      }),
    ).toMatchObject({
      score: 0,
      band: "low",
      signals: [],
      explanation: {
        headline: "Few signs raised concern",
      },
    });
  });
});
