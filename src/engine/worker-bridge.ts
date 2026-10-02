import { isAnalysisRequest, isRiskResult } from "./worker-contract";
import { ANALYSIS_FAILURE_MESSAGE } from "./worker-contract";
import type {
  AnalysisKind,
  AnalysisOutcome,
  AnalysisPayloadByKind,
  AnalysisRequest,
} from "./worker-contract";

export { ANALYSIS_FAILURE_MESSAGE } from "./worker-contract";
export type {
  AnalysisKind,
  AnalysisOutcome,
  AnalysisPayloadByKind,
  AnalysisRequest,
  MessageAnalysisPayload,
  TransactionAnalysisPayload,
} from "./worker-contract";

const ANALYSIS_TIMEOUT_MS = 3_000;

export interface AnalysisWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(request: AnalysisRequest): void;
  terminate(): void;
}

export interface RunAnalysisOptions {
  createWorker?: () => AnalysisWorker;
}

function createModuleWorker(): AnalysisWorker {
  return new Worker(
    new URL("./analysis.worker.ts", import.meta.url),
    { type: "module" },
  );
}

function failure(): AnalysisOutcome {
  return { status: "failure", message: ANALYSIS_FAILURE_MESSAGE };
}

export async function runAnalysis<Kind extends AnalysisKind>(
  kind: Kind,
  payload: AnalysisPayloadByKind[Kind],
  options: RunAnalysisOptions = {},
): Promise<AnalysisOutcome> {
  const request: unknown = { kind, payload };
  if (!isAnalysisRequest(request)) return failure();

  return new Promise((resolve) => {
    let worker: AnalysisWorker;
    try {
      worker = (options.createWorker ?? createModuleWorker)();
    } catch {
      resolve(failure());
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => settle(failure()), ANALYSIS_TIMEOUT_MS);

    function settle(outcome: AnalysisOutcome): void {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      let finalOutcome = outcome;
      try {
        worker.terminate();
      } catch {
        finalOutcome = failure();
      }
      resolve(finalOutcome);
    }

    worker.onmessage = (event) => {
      settle(
        isRiskResult(event.data)
          ? { status: "success", result: event.data }
          : failure(),
      );
    };
    worker.onerror = () => settle(failure());
    worker.onmessageerror = () => settle(failure());

    try {
      worker.postMessage(request);
    } catch {
      settle(failure());
    }
  });
}
