import type { RiskResult, Transaction } from "./types";

export function analyseTransaction(
  _tx: Transaction,
  _history: Transaction[],
  _recentMsg?: RiskResult,
): RiskResult {
  return {
    score: 0,
    band: "low",
    signals: [],
  };
}
