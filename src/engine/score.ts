import { MESSAGE_SCORING_CONFIG } from "./config";
import type { RiskBand, RiskResult, Signal } from "./types";

const SCAM_TYPE_PRECEDENCE = [
  "job_scam",
  "phishing",
  "romance_scam",
  "mobile_money_reversal",
  "mule_request",
  "impersonation",
] as const;

type ScamType = (typeof SCAM_TYPE_PRECEDENCE)[number] | "prize_scam";

interface ScamTypeCandidate {
  type: ScamType;
  strength: number;
  precedence: number;
}

function getBand(score: number, hasCredentialRequest: boolean): RiskBand {
  if (hasCredentialRequest || score > MESSAGE_SCORING_CONFIG.bands.mediumMax) {
    return "high";
  }
  return score <= MESSAGE_SCORING_CONFIG.bands.lowMax ? "low" : "medium";
}

function normalizedWeight(weight: number): number {
  if (Number.isNaN(weight)) return MESSAGE_SCORING_CONFIG.signalWeight.min;
  return Math.min(
    MESSAGE_SCORING_CONFIG.signalWeight.max,
    Math.max(MESSAGE_SCORING_CONFIG.signalWeight.min, weight),
  );
}

function sortedSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((left, right) => {
    const weightDifference =
      normalizedWeight(right.weight) - normalizedWeight(left.weight);
    if (weightDifference !== 0) return weightDifference;
    if (left.id !== right.id) return left.id < right.id ? -1 : 1;
    const leftEvidence = left.evidence ?? "";
    const rightEvidence = right.evidence ?? "";
    if (leftEvidence === rightEvidence) return 0;
    return leftEvidence < rightEvidence ? -1 : 1;
  });
}

function selectScamType(signals: Signal[]): ScamType | undefined {
  const weights = new Map<string, number>();
  for (const signal of signals) {
    const weight = normalizedWeight(signal.weight);
    weights.set(signal.id, Math.max(weights.get(signal.id) ?? 0, weight));
  }

  const upfrontFeeWeight = weights.get("UPFRONT_FEE");
  if (upfrontFeeWeight !== undefined && weights.has("PRIZE_WIN")) {
    return "prize_scam";
  }

  const candidates: ScamTypeCandidate[] = [];
  const addCandidate = (type: ScamType, strength: number) => {
    candidates.push({
      type,
      strength,
      precedence:
        type === "prize_scam"
          ? -1
          : SCAM_TYPE_PRECEDENCE.indexOf(type),
    });
  };

  if (upfrontFeeWeight !== undefined) {
    addCandidate("job_scam", upfrontFeeWeight);
  }

  const credentialWeight = weights.get("CREDENTIAL_REQUEST");
  const phishingEvidenceWeights = [
    weights.get("IMPERSONATION"),
    weights.get("LOOKALIKE_LINK"),
    weights.get("URGENCY"),
  ].filter((weight): weight is number => weight !== undefined);
  const hasPhishingCombination =
    credentialWeight !== undefined && phishingEvidenceWeights.length > 0;
  if (hasPhishingCombination) {
    const phishingEvidenceWeight = Math.max(...phishingEvidenceWeights);
    addCandidate(
      "phishing",
      Math.min(credentialWeight, phishingEvidenceWeight),
    );
  }

  const singleSignalTypes: Array<[string, Exclude<ScamType, "prize_scam" | "phishing">]> = [
    ["ROMANCE_MONEY", "romance_scam"],
    ["MONEY_REVERSAL", "mobile_money_reversal"],
    ["CREATE_ORDER_FOR_THEM", "mule_request"],
    ["IMPERSONATION", "impersonation"],
  ];
  for (const [signalId, type] of singleSignalTypes) {
    if (signalId === "IMPERSONATION" && hasPhishingCombination) continue;
    const strength = weights.get(signalId);
    if (strength !== undefined) addCandidate(type, strength);
  }

  candidates.sort(
    (left, right) =>
      right.strength - left.strength || left.precedence - right.precedence,
  );
  return candidates[0]?.type;
}

export function scoreSignals(signals: Signal[]): RiskResult {
  const orderedSignals = sortedSignals(signals);
  const remainingRisk = orderedSignals.reduce(
    (remaining, signal) => remaining * (1 - normalizedWeight(signal.weight)),
    1,
  );
  const score = Math.max(
    0,
    Math.min(100, Math.round((1 - remainingRisk) * 100)),
  );
  const hasCredentialRequest = orderedSignals.some(
    (signal) => signal.id === "CREDENTIAL_REQUEST",
  );
  const band = getBand(score, hasCredentialRequest);
  const scamType = band === "low" ? undefined : selectScamType(orderedSignals);

  return {
    score,
    band,
    signals: orderedSignals,
    ...(scamType === undefined ? {} : { scamType }),
  };
}
