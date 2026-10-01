import type { Lang, RiskResult } from "./types";

export function analyseMessage(_text: string, _lang?: Lang): RiskResult {
  return {
    score: 0,
    band: "low",
    signals: [],
  };
}
