import { dispatchAnalysisRequest } from "./analysis-dispatch";
import type { RiskResult } from "./types";

interface AnalysisWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void;
  postMessage(result: RiskResult): void;
}

const workerScope = globalThis as unknown as AnalysisWorkerScope;

workerScope.addEventListener("message", (event) => {
  workerScope.postMessage(dispatchAnalysisRequest(event.data));
});
