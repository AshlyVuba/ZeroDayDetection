export { explain } from "./explain";
export {
  analyseMessage,
  matchMessageSignals,
  MESSAGE_RULES,
  normalizeMessage,
} from "./message";
export { matchLinkSignals } from "./links";
export { scoreSignals } from "./score";
export { analyseTransaction } from "./transaction";
export type { Explanation } from "./explain";
export type { NormalizedMessage, Rule } from "./message";
export type { Lang, RiskBand, RiskResult, Signal, Transaction } from "./types";
