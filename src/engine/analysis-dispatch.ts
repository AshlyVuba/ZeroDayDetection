import { analyseMessage } from "./message";
import { analyseTransaction } from "./transaction";
import { isAnalysisRequest } from "./worker-contract";
import type { AnalysisRequest } from "./worker-contract";
import type { RiskResult } from "./types";

export function dispatchAnalysisRequest(request: unknown): RiskResult {
  if (!isAnalysisRequest(request)) {
    throw new TypeError("Invalid analysis request");
  }

  return dispatchValidatedRequest(request);
}

function dispatchValidatedRequest(request: AnalysisRequest): RiskResult {
  if (request.kind === "message") {
    return analyseMessage(request.payload.text, request.payload.lang);
  }
  return analyseTransaction(
    request.payload.transaction,
    request.payload.history,
    request.payload.recentMessage,
  );
}
