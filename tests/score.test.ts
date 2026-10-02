import { describe, expect, it } from "vitest";
import { scoreSignals } from "../src/engine";
import type { Signal } from "../src/engine";

const signal = (id: string, weight: number, evidence?: string): Signal => ({
  id,
  weight,
  ...(evidence === undefined ? {} : { evidence }),
});

describe("scoreSignals", () => {
  it("combines weights with noisy-OR and rounds to an integer", () => {
    expect(scoreSignals([signal("A", 0.55), signal("B", 0.3)])).toMatchObject({
      score: 69,
      band: "high",
    });
  });

  it("forces credential requests into the high band", () => {
    expect(scoreSignals([signal("CREDENTIAL_REQUEST", 0.01)])).toMatchObject({
      score: 1,
      band: "high",
    });
  });

  it("clamps signal probabilities and the resulting integer score", () => {
    expect(scoreSignals([signal("OVERWEIGHT", 1.5)])).toMatchObject({
      score: 100,
      band: "high",
    });
    expect(scoreSignals([signal("NEGATIVE", -0.5)])).toMatchObject({
      score: 0,
      band: "low",
    });
  });

  it.each([
    [0.24, 24, "low"],
    [0.25, 25, "medium"],
    [0.59, 59, "medium"],
    [0.6, 60, "high"],
  ] as const)("assigns score %i to %s band", (weight, score, band) => {
    expect(scoreSignals([signal("OTHER", weight)])).toMatchObject({
      score,
      band,
    });
  });

  it("sorts signals strongest first with deterministic ties", () => {
    const input = [
      signal("Z_SIGNAL", 0.4),
      signal("B_SIGNAL", 0.4, "second"),
      signal("A_SIGNAL", 0.4),
      signal("STRONGEST", 0.8),
      signal("B_SIGNAL", 0.4, "first"),
    ];

    expect(scoreSignals(input).signals).toEqual([
      signal("STRONGEST", 0.8),
      signal("A_SIGNAL", 0.4),
      signal("B_SIGNAL", 0.4, "first"),
      signal("B_SIGNAL", 0.4, "second"),
      signal("Z_SIGNAL", 0.4),
    ]);
    expect(input[0]).toEqual(signal("Z_SIGNAL", 0.4));
  });

  it.each([
    [["UPFRONT_FEE"], "job_scam"],
    [["UPFRONT_FEE", "PRIZE_WIN"], "prize_scam"],
    [["CREDENTIAL_REQUEST", "IMPERSONATION"], "phishing"],
    [["CREDENTIAL_REQUEST", "LOOKALIKE_LINK"], "phishing"],
    [["CREDENTIAL_REQUEST", "URGENCY"], "phishing"],
    [["ROMANCE_MONEY"], "romance_scam"],
    [["MONEY_REVERSAL"], "mobile_money_reversal"],
    [["CREATE_ORDER_FOR_THEM"], "mule_request"],
    [["IMPERSONATION"], "impersonation"],
  ] as const)("selects the %s scam type", (ids, scamType) => {
    const signals = ids.map((id) => signal(id, 0.3));
    expect(scoreSignals(signals).scamType).toBe(scamType);
    expect(
      scoreSignals([...signals].reverse()).scamType,
    ).toBe(scamType);
  });

  it("selects the strongest scam type and honors phishing and prize precedence", () => {
    expect(
      scoreSignals([
        signal("UPFRONT_FEE", 0.4),
        signal("ROMANCE_MONEY", 0.8),
      ]).scamType,
    ).toBe("romance_scam");

    expect(
      scoreSignals([
        signal("CREDENTIAL_REQUEST", 0.3),
        signal("IMPERSONATION", 0.9),
      ]).scamType,
    ).toBe("phishing");

    expect(
      scoreSignals([
        signal("UPFRONT_FEE", 0.4),
        signal("PRIZE_WIN", 0.1),
        signal("ROMANCE_MONEY", 0.8),
      ]).scamType,
    ).toBe("prize_scam");
  });

  it("does not assign a scam type to a low-risk result", () => {
    expect(scoreSignals([signal("UPFRONT_FEE", 0.1)])).toEqual({
      score: 10,
      band: "low",
      signals: [signal("UPFRONT_FEE", 0.1)],
    });
  });

  it("returns zero, low risk, and no type for empty signals", () => {
    expect(scoreSignals([])).toEqual({
      score: 0,
      band: "low",
      signals: [],
    });
  });
});
