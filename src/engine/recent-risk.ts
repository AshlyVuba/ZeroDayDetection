import type { RecentRiskRecord, ScamType } from "./types";

export const RECENT_RISK_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

const SCAM_TYPES: readonly ScamType[] = [
  "job_scam",
  "phishing",
  "romance_scam",
  "mobile_money_reversal",
  "mule_request",
  "impersonation",
  "prize_scam",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function cleanRecentRisk(
  value: unknown,
  now = Date.now(),
): RecentRiskRecord | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (
    keys.some((key) => !["band", "timestamp", "scamType"].includes(key)) ||
    (value.band !== "medium" && value.band !== "high") ||
    typeof value.timestamp !== "number" ||
    !Number.isFinite(value.timestamp) ||
    value.timestamp > now ||
    now - value.timestamp > RECENT_RISK_MAX_AGE_MS ||
    (value.scamType !== undefined &&
      !SCAM_TYPES.includes(value.scamType as ScamType))
  ) {
    return undefined;
  }
  return {
    band: value.band,
    timestamp: value.timestamp,
    ...(value.scamType === undefined ? {} : { scamType: value.scamType as ScamType }),
  };
}