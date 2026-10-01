import type { Lang, RiskResult } from "./types";

export interface Explanation {
  headline: string;
  reasons: string[];
  nextSteps: string[];
}

export function explain(_result: RiskResult, _lang: Lang): Explanation {
  return {
    headline: "The explanation is not available yet.",
    reasons: [],
    nextSteps: ["Check with someone you trust before you act."],
  };
}
