import { analyseMessage } from "./message";
import { analyseTransaction } from "./transaction";
import { explain } from "./explain";
import { isAnalysisRequest } from "./worker-contract";
import type { AnalysisRequest, AnalysisResult } from "./worker-contract";

export function dispatchAnalysisRequest(request: unknown): AnalysisResult {
  if (!isAnalysisRequest(request)) {
    throw new TypeError("Invalid analysis request");
  }

  const result = dispatchValidatedRequest(request);
  const lang =
    request.kind === "message" ? (request.payload.lang ?? "en") : "en";
  return { ...result, explanation: explain(result, lang) };
}

function dispatchValidatedRequest(request: AnalysisRequest) {
  if (request.kind === "message") {
    return analyseMessage(request.payload.text, request.payload.lang);
  }
  return analyseTransaction(
    request.payload.transaction,
    request.payload.history,
    request.payload.recentMessage,
  );
}
