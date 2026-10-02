import { describe, expect, it } from "vitest";
import fixtureData from "./fixtures/cases.json";

const cases = fixtureData;

describe("playbook case fixtures", () => {
  it("contains twelve uniquely identified cases with the shared fixture shape", () => {
    expect(cases).toHaveLength(12);
    expect(new Set(cases.map(({ id }) => id)).size).toBe(12);

    for (const fixture of cases) {
      expect(fixture.id).toMatch(/^case-\d{2}$/);
      expect(["message", "transaction"]).toContain(fixture.kind);
      expect(fixture.text ?? fixture.scenario).toBeTruthy();
      expect(fixture.expectedBands.length).toBeGreaterThan(0);
      expect(fixture.expectedSignals).toEqual(expect.any(Array));
    }
  });

  it("records the alternate bands and transaction relationships", () => {
    expect(cases.slice(0, 6).map(({ expectedSignals }) => expectedSignals)).toEqual([
      ["UPFRONT_FEE", "SECRECY", "RISKY_PAYMENT_METHOD"],
      ["CREDENTIAL_REQUEST", "URGENCY", "SHORTENED_LINK"],
      ["MONEY_REVERSAL"],
      ["ROMANCE_MONEY", "RISKY_PAYMENT_METHOD"],
      ["TOO_GOOD_PAY", "OFF_PLATFORM"],
      ["PRIZE_WIN", "UPFRONT_FEE"],
    ]);
    expect(cases[2].expectedBands).toEqual(["medium", "high"]);
    expect(cases[4].expectedBands).toEqual(["medium", "high"]);
    expect(cases.slice(6, 10).every(({ expectedBands, expectedSignals }) =>
      expectedBands.includes("low") && expectedSignals.length === 0,
    )).toBe(true);
    expect(cases[10]).toMatchObject({
      relatedMessageCaseId: "case-01",
      minutesAfterRelatedMessage: 20,
      recipientType: "new",
      timeOfDay: "02:30",
      expectedBands: ["high"],
    });
    expect(cases[11]).toMatchObject({
      recipientType: "known",
      timeOfDay: "midday",
      expectedBands: ["low"],
      expectedSignals: [],
    });
  });
});
