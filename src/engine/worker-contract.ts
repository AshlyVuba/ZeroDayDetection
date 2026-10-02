import type { Lang, RiskResult, Transaction } from "./types";

export const ANALYSIS_FAILURE_MESSAGE =
  "We couldn't check this. Be careful and verify.";

export type AnalysisKind = "message" | "transaction";

export interface MessageAnalysisPayload {
  text: string;
  lang?: Lang;
}

export interface TransactionAnalysisPayload {
  transaction: Transaction;
  history: Transaction[];
  recentMessage?: RiskResult;
}

export type AnalysisPayloadByKind = {
  message: MessageAnalysisPayload;
  transaction: TransactionAnalysisPayload;
};

export type AnalysisRequest = {
  [Kind in AnalysisKind]: {
    kind: Kind;
    payload: AnalysisPayloadByKind[Kind];
  };
}[AnalysisKind];

export type AnalysisOutcome =
  | { status: "success"; result: RiskResult }
  | { status: "failure"; message: typeof ANALYSIS_FAILURE_MESSAGE };

function isPlainData(value: unknown, ancestors = new WeakSet<object>()): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) return false;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== value.length + 1 || !keys.includes("length")) {
        return false;
      }
      ancestors.add(value);
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor) ||
          !isPlainData(descriptor.value, ancestors)
        ) {
          ancestors.delete(value);
          return false;
        }
      }
      ancestors.delete(value);
      return true;
    }

    if (prototype !== Object.prototype && prototype !== null) return false;
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        ancestors.delete(value);
        return false;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        !isPlainData(descriptor.value, ancestors)
      ) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  } catch {
    return false;
  }
}

function hasKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isLang(value: unknown): value is Lang {
  return (
    value === "en" ||
    value === "sn" ||
    value === "nd" ||
    value === "zu" ||
    value === "pt" ||
    value === "sw"
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (!isPlainData(value) || value === null || Array.isArray(value)) return false;
  const transaction = value as Record<string, unknown>;
  return (
    hasKeys(transaction, ["id", "recipientId", "amount", "currency", "timestamp"]) &&
    typeof transaction.id === "string" &&
    typeof transaction.recipientId === "string" &&
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount) &&
    typeof transaction.currency === "string" &&
    typeof transaction.timestamp === "number" &&
    Number.isFinite(transaction.timestamp)
  );
}

function isSignal(value: unknown): boolean {
  if (!isPlainData(value) || value === null || Array.isArray(value)) return false;
  const signal = value as Record<string, unknown>;
  return (
    hasKeys(signal, ["id", "weight"], ["evidence"]) &&
    typeof signal.id === "string" &&
    typeof signal.weight === "number" &&
    Number.isFinite(signal.weight) &&
    (!Object.hasOwn(signal, "evidence") ||
      typeof signal.evidence === "string")
  );
}

export function isRiskResult(value: unknown): value is RiskResult {
  if (!isPlainData(value) || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    hasKeys(result, ["score", "band", "signals"], ["scamType"]) &&
    typeof result.score === "number" &&
    Number.isInteger(result.score) &&
    result.score >= 0 &&
    result.score <= 100 &&
    (result.band === "low" ||
      result.band === "medium" ||
      result.band === "high") &&
    Array.isArray(result.signals) &&
    result.signals.every(isSignal) &&
    (!Object.hasOwn(result, "scamType") ||
      typeof result.scamType === "string")
  );
}

export function isAnalysisRequest(value: unknown): value is AnalysisRequest {
  if (!isPlainData(value) || value === null || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (!hasKeys(request, ["kind", "payload"])) return false;
  if (
    !isPlainData(request.payload) ||
    request.payload === null ||
    Array.isArray(request.payload)
  ) {
    return false;
  }

  const payload = request.payload as Record<string, unknown>;
  if (request.kind === "message") {
    return (
      hasKeys(payload, ["text"], ["lang"]) &&
      typeof payload.text === "string" &&
      (!Object.hasOwn(payload, "lang") || isLang(payload.lang))
    );
  }
  if (request.kind === "transaction") {
    return (
      hasKeys(payload, ["transaction", "history"], ["recentMessage"]) &&
      isTransaction(payload.transaction) &&
      Array.isArray(payload.history) &&
      payload.history.every(isTransaction) &&
      (!Object.hasOwn(payload, "recentMessage") ||
        isRiskResult(payload.recentMessage))
    );
  }
  return false;
}
