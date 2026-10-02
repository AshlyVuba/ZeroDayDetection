import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnalysisRequest } from "../src/engine/analysis-dispatch";
import {
  ANALYSIS_FAILURE_MESSAGE,
  runAnalysis,
  type AnalysisRequest,
  type AnalysisWorker,
} from "../src/engine/worker-bridge";

const riskResult = {
  score: 64,
  band: "high",
  signals: [{ id: "URGENCY", weight: 0.2, evidence: "act now" }],
} as const;

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
    workers[1].response = { score: 0, band: "low", signals: [] };
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
      { status: "success", result: { score: 0, band: "low", signals: [] } },
    ]);
    expect(workers.map((worker) => worker.postedRequest?.payload)).toEqual([
      { text: "first" },
      { text: "second" },
    ]);
    expect(workers.map((worker) => worker.terminateCount)).toEqual([1, 1]);
  });
});

describe("analysis worker dispatch", () => {
  it("returns only the message analyzer's risk result", () => {
    expect(
      dispatchAnalysisRequest({
        kind: "message",
        payload: { text: "Please send your password so I can verify." },
      }),
    ).toEqual({
      score: 0,
      band: "low",
      signals: [
        {
          id: "CREDENTIAL_REQUEST",
          weight: 0.8,
          evidence: "Please send your password so I can verif",
        },
      ],
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

  it("accepts transaction analysis payloads and returns only a risk result", () => {
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
    ).toEqual({ score: 0, band: "low", signals: [] });
  });
});
