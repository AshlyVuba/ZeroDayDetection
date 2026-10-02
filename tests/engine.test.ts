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
    expect(analyseTransaction(transaction, [])).toMatchObject({
      band: expect.any(String),
      signals: expect.arrayContaining([
        expect.objectContaining({ id: "NEW_RECIPIENT" }),
      ]),
    });
  });

  it("provides a signal-grounded explanation and a next step", () => {
    expect(explain(analyseMessage("sample message"), "en")).toEqual({
      headline: "No clear warning signs were found.",
      reasons: [],
      nextSteps: [
        "Check the request with someone you trust using contact details you already know.",
      ],
    });
  });
});
