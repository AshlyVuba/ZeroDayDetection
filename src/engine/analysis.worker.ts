import { dispatchAnalysisRequest } from "./analysis-dispatch";
import type { AnalysisResult } from "./worker-contract";

interface AnalysisWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void;
  postMessage(result: AnalysisResult): void;
}

const workerScope = globalThis as unknown as AnalysisWorkerScope;

workerScope.addEventListener("message", (event) => {
  workerScope.postMessage(dispatchAnalysisRequest(event.data));
});
