import { describe, expect, it } from "vitest";
import {
  analyseTransaction,
  normalizeRecipientId,
  scoreSignals,
  type RiskResult,
  type Transaction,
} from "../src/engine";
import { seedTransactions } from "../src/data/seedTransactions";

const now = new Date(2025, 3, 1, 12).getTime();

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "current",
    recipientId: "recipient-1",
    amount: 100,
    currency: "ZAR",
    timestamp: now,
    ...overrides,
  };
}

function historyWithAmounts(amounts: number[]): Transaction[] {
  return amounts.map((amount, index) =>
    transaction({
      id: `past-${index}`,
      amount,
      timestamp: now - (amounts.length - index) * 24 * 60 * 60 * 1_000,
    }),
  );
}

function signalIds(result: RiskResult): string[] {
  return result.signals.map((signal) => signal.id);
}

describe("analyseTransaction", () => {
  it("recognizes new recipients after normalizing known recipient IDs", () => {
    const knownRecipient = transaction({
      id: "known-recipient-payment",
      recipientId: "071 234 5678",
    });
    const matchingRecipient = transaction({
      recipientId: "+27 71 234 5678",
    });

    expect(
      signalIds(analyseTransaction(matchingRecipient, [knownRecipient])),
    ).not.toContain("NEW_RECIPIENT");
    expect(
      signalIds(
        analyseTransaction(transaction({ recipientId: "recipient-2" }), [
          knownRecipient,
        ]),
      ),
    ).toContain("NEW_RECIPIENT");
    expect(normalizeRecipientId(matchingRecipient.recipientId)).toBe(
      normalizeRecipientId(knownRecipient.recipientId),
    );
  });

  it.each([
    ["exactly three times the median", [100, 100, 100], 300, true],
    ["below three times the median", [100, 100, 100], 299.99, false],
    ["fewer than three past payments", [100, 100], 1_000, false],
  ])("detects amount spikes at the configured boundary: %s", (_name, amounts, amount, expected) => {
    const result = analyseTransaction(
      transaction({ amount }),
      historyWithAmounts(amounts),
    );

    expect(signalIds(result).includes("AMOUNT_SPIKE")).toBe(expected);
  });

  it.each([
    ["just below the large-payment limit", 9_999.99, [], false],
    ["at the large-payment limit", 10_000, [], true],
    ["a repeat of an earlier large payment", 10_000, [10_000], false],
  ])("detects a first large payment at the configured boundary: %s", (_name, amount, pastAmounts, expected) => {
    const result = analyseTransaction(
      transaction({ amount }),
      historyWithAmounts(pastAmounts),
    );

    expect(signalIds(result).includes("FIRST_LARGE")).toBe(expected);
  });

  it.each([
    ["exactly 60 minutes before", [now - 60 * 60_000, now - 30 * 60_000], true],
    ["more than 60 minutes before", [now - 60 * 60_000 - 1, now - 30 * 60_000], false],
  ])("detects rapid repeats at the inclusive time boundary: %s", (_name, timestamps, expected) => {
    const repeatedTransactions = timestamps.map((timestamp, index) =>
      transaction({
        id: `repeat-${index}`,
        recipientId: index === 0 ? "071 234 5678" : "+27 71 234 5678",
        timestamp,
      }),
    );
    const current = transaction({ recipientId: "0712345678" });

    expect(
      signalIds(analyseTransaction(current, repeatedTransactions)).includes(
        "RAPID_REPEAT",
      ),
    ).toBe(expected);
  });

  it.each([
    ["minimum configured fee-like amount", 50, true],
    ["maximum configured fee-like amount", 1_500, true],
    ["just above the maximum", 1_500.01, false],
    ["not a configured round amount", 49.99, false],
  ])("detects fee-like amounts at configured boundaries: %s", (_name, amount, expected) => {
    const result = analyseTransaction(transaction({ amount }), []);

    expect(signalIds(result).includes("FEE_LIKE_AMOUNT")).toBe(expected);
  });

  it.each([
    ["before the odd-hour window", new Date(2025, 3, 1, 5, 59), true],
    ["at the end of the odd-hour window", new Date(2025, 3, 1, 6), false],
    ["before the late-night window", new Date(2025, 3, 1, 21, 59), false],
    ["at the start of the late-night window", new Date(2025, 3, 1, 22), true],
  ])("detects odd hours at local-time boundaries: %s", (_name, timestamp, expected) => {
    const result = analyseTransaction(
      transaction({ timestamp: timestamp.getTime() }),
      [],
    );

    expect(signalIds(result).includes("ODD_HOUR")).toBe(expected);
  });

  it("keeps a normal first payment low when history is empty", () => {
    const result = analyseTransaction(transaction(), []);

    expect(result.band).not.toBe("high");
    expect(signalIds(result)).toContain("NEW_RECIPIENT");
    expect(signalIds(result)).not.toContain("FIRST_LARGE");
  });

  it("keeps the normal twelfth seed transaction low", () => {
    const result = analyseTransaction(
      seedTransactions[11],
      seedTransactions.slice(0, 11),
    );

    expect(result.band).toBe("low");
  });

  it("combines the recent-message signals with transaction signals via the shared scorer", () => {
    const recentMessage = scoreSignals([
      { id: "UPFRONT_FEE", weight: 0.3 },
    ]);
    const result = analyseTransaction(transaction(), [], recentMessage);

    expect(signalIds(result)).toEqual(
      expect.arrayContaining(["NEW_RECIPIENT", "UPFRONT_FEE"]),
    );
    expect(result.score).toBeGreaterThan(recentMessage.score);
  });

  it("does not mutate the transaction history or its entries", () => {
    const history = [
      transaction({
        id: "past-1",
        recipientId: "+27 71 234 5678",
        amount: 100,
        timestamp: now - 60 * 60_000,
      }),
      transaction({
        id: "past-2",
        recipientId: "0712345678",
        amount: 100,
        timestamp: now - 30 * 60_000,
      }),
      transaction({
        id: "past-3",
        recipientId: "recipient-3",
        amount: 100,
        timestamp: now - 24 * 60 * 60_000,
      }),
    ];
    const originalHistory = structuredClone(history);

    analyseTransaction(transaction({ amount: 300 }), history);

    expect(history).toEqual(originalHistory);
  });
});
