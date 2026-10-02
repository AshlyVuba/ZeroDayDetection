import {
  FEE_LIKE_SETTINGS,
  LARGE_TRANSACTION_LIMITS_MINOR_UNITS,
  MIN_SPIKE_HISTORY,
  RAPID_COUNT,
  RAPID_MINUTES,
  SPIKE_MULTIPLIER,
  TRANSACTION_SCORING_CONFIG,
} from "./config";
import {
  countWithin,
  isOddHour,
  medianLastN,
  normalizeRecipientId,
  toMinorUnits,
} from "./transactionHelpers";
import { scoreSignals } from "./score";
import type { RiskResult, Transaction } from "./types";

export function analyseTransaction(
  tx: Transaction,
  history: Transaction[],
  recentMsg?: RiskResult,
): RiskResult {
  const signals = [];
  const recipientId = normalizeRecipientId(tx.recipientId);
  const pastHistory = history.filter(
    (transaction) =>
      transaction.id !== tx.id && transaction.timestamp <= tx.timestamp,
  );
  const transactionWeight =
    TRANSACTION_SCORING_CONFIG.signalWeights;

  if (
    !pastHistory.some(
      (transaction) =>
        normalizeRecipientId(transaction.recipientId) === recipientId,
    )
  ) {
    signals.push({
      id: "NEW_RECIPIENT",
      weight: transactionWeight.NEW_RECIPIENT,
    });
  }

  const sameCurrencyHistory = pastHistory.filter(
    (transaction) => transaction.currency === tx.currency,
  );
  if (sameCurrencyHistory.length >= MIN_SPIKE_HISTORY) {
    const priorAmounts = sameCurrencyHistory.map((transaction) =>
      toMinorUnits(transaction.amount, transaction.currency),
    );
    const medianAmount = medianLastN(priorAmounts, priorAmounts.length);
    const currentAmount = toMinorUnits(tx.amount, tx.currency);
    if (
      medianAmount !== undefined &&
      medianAmount > 0 &&
      currentAmount >= medianAmount * SPIKE_MULTIPLIER
    ) {
      signals.push({
        id: "AMOUNT_SPIKE",
        weight: transactionWeight.AMOUNT_SPIKE,
      });
    }
  }

  const largeLimit =
    LARGE_TRANSACTION_LIMITS_MINOR_UNITS[
      tx.currency as keyof typeof LARGE_TRANSACTION_LIMITS_MINOR_UNITS
    ];
  if (largeLimit !== undefined) {
    const currentAmount = toMinorUnits(tx.amount, tx.currency);
    const hasPriorLargePayment = sameCurrencyHistory.some(
      (transaction) =>
        toMinorUnits(transaction.amount, transaction.currency) >= largeLimit,
    );
    if (currentAmount >= largeLimit && !hasPriorLargePayment) {
      signals.push({
        id: "FIRST_LARGE",
        weight: transactionWeight.FIRST_LARGE,
      });
    }
  }

  const normalizedHistory = pastHistory.filter(
    (transaction) =>
      normalizeRecipientId(transaction.recipientId) === recipientId,
  );
  const recentRecipientPaymentCount =
    countWithin(
      normalizedHistory.map((transaction) => transaction.timestamp),
      RAPID_MINUTES,
      tx.timestamp,
    ) + 1;
  if (recentRecipientPaymentCount >= RAPID_COUNT) {
    signals.push({
      id: "RAPID_REPEAT",
      weight: transactionWeight.RAPID_REPEAT,
    });
  }

  if (tx.currency === FEE_LIKE_SETTINGS.currency) {
    const currentAmount = toMinorUnits(tx.amount, tx.currency);
    if (
      currentAmount > 0 &&
      currentAmount <= FEE_LIKE_SETTINGS.maxMinorUnits &&
      currentAmount % FEE_LIKE_SETTINGS.roundToMinorUnits === 0
    ) {
      signals.push({
        id: "FEE_LIKE_AMOUNT",
        weight: transactionWeight.FEE_LIKE_AMOUNT,
      });
    }
  }

  if (isOddHour(tx.timestamp)) {
    signals.push({
      id: "ODD_HOUR",
      weight: transactionWeight.ODD_HOUR,
    });
  }

  return scoreSignals([
    ...signals,
    ...(recentMsg?.signals ?? []),
  ]);
}
