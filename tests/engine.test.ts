import { describe, expect, it } from "vitest";
import {
  analyseMessage,
  analyseTransaction,
  explain,
  type Transaction,
} from "../src/engine";

const transaction: Transaction = {
  id: "tx-1",
  recipientId: "recipient-1",
  amount: 100,
  currency: "ZAR",
  timestamp: 1_700_000_000_000,
};

describe("engine scaffold", () => {
  it("returns the shared risk result shape for messages", () => {
    expect(analyseMessage("sample message")).toEqual({
      score: 0,
      band: "low",
      signals: [],
    });
  });

  it("returns the shared risk result shape for transactions", () => {
    expect(analyseTransaction(transaction, [])).toEqual({
      score: 0,
      band: "low",
      signals: [],
    });
  });

  it("provides an explanation and a next step", () => {
    expect(explain(analyseMessage("sample message"), "en")).toEqual({
      headline: "The explanation is not available yet.",
      reasons: [],
      nextSteps: ["Check with someone you trust before you act."],
    });
  });
});
