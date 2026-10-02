import { describe, expect, it } from "vitest";
import {
  countWithin,
  FEE_LIKE_SETTINGS,
  isOddHour,
  LARGE_TRANSACTION_LIMITS_MINOR_UNITS,
  medianLastN,
  MINOR_UNITS_PER_MAJOR_UNIT,
  normalizeRecipientId,
  RAPID_COUNT,
  RAPID_MINUTES,
  SPIKE_MULTIPLIER,
  toMinorUnits,
} from "../src/engine";
import { seedTransactions } from "../src/data/seedTransactions";

describe("transaction helpers", () => {
  it("normalizes South African phone recipient variants to the same ID", () => {
    expect(normalizeRecipientId("+27 71 234 5678")).toBe("27712345678");
    expect(normalizeRecipientId("0712345678")).toBe("27712345678");
    expect(normalizeRecipientId("  recipient-1 ")).toBe("recipient-1");
  });

  it("calculates a median from up to the requested number of latest values", () => {
    expect(medianLastN([10, 20, 30], 10)).toBe(20);
    expect(medianLastN([1, 100, 3, 4], 3)).toBe(4);
    expect(medianLastN([], 10)).toBeUndefined();
  });

  it("counts timestamps within an inclusive window without counting future items", () => {
    const now = Date.UTC(2025, 0, 1, 12);
    const minute = 60_000;

    expect(
      countWithin(
        [now - 60 * minute - 1, now - 60 * minute, now - minute, now, now + 1],
        60,
        now,
      ),
    ).toBe(3);
  });

  it("classifies odd hours using fixed device-local timestamps", () => {
    const localTwoAm = new Date(2025, 0, 15, 2).getTime();
    const localNoon = new Date(2025, 0, 15, 12).getTime();

    expect(isOddHour(localTwoAm)).toBe(true);
    expect(isOddHour(localNoon)).toBe(false);
  });

  it("keeps thresholds in currency minor units without changing transaction amounts", () => {
    expect(SPIKE_MULTIPLIER).toBe(3);
    expect(RAPID_COUNT).toBe(3);
    expect(RAPID_MINUTES).toBe(60);
    expect(MINOR_UNITS_PER_MAJOR_UNIT.ZAR).toBe(100);
    expect(toMinorUnits(150, "ZAR")).toBe(15_000);
    expect(LARGE_TRANSACTION_LIMITS_MINOR_UNITS).toEqual({
      ZAR: 1_000_000,
      USD: 100_000,
    });
    expect(FEE_LIKE_SETTINGS).toEqual({
      currency: "ZAR",
      roundToMinorUnits: 5_000,
      maxMinorUnits: 150_000,
    });
  });

  it("provides 12 fixed invented transactions for two recipients across six weeks", () => {
    expect(seedTransactions).toHaveLength(12);
    const recipientIds = seedTransactions.map((transaction) =>
      normalizeRecipientId(transaction.recipientId),
    );
    expect(new Set(recipientIds).size).toBe(2);
    expect(
      seedTransactions.every(
        (transaction) => transaction.amount >= 150 && transaction.amount <= 400,
      ),
    ).toBe(true);
    const span = seedTransactions[11].timestamp - seedTransactions[0].timestamp;
    expect(span).toBe(42 * 24 * 60 * 60 * 1_000);
  });
});
