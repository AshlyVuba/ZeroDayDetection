import { describe, expect, it } from "vitest";
import english from "../src/i18n/en.json";
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

  it("provides cautious generic guidance when there are no warning signals", () => {
    expect(explain(analyseMessage("sample message"), "en")).toEqual({
      headline: "Few signs raised concern",
      reasons: [],
      nextSteps: [
        "Pause before acting on this request.",
        "Verify details through a source you find independently.",
        "Ask someone you trust to review it.",
      ],
    });
  });

  it.each([
    [
      "job_scam",
      "Pay R450 as a registration fee before your first shift.",
    ],
    [
      "phishing",
      "Please send your password. Your account will be locked unless you verify now.",
    ],
    [
      "romance_scam",
      "My online partner needs me to send money for rent.",
    ],
    [
      "mobile_money_reversal",
      "I sent it by mistake, please return the extra money.",
    ],
    [
      "prize_scam",
      "You won a prize. Pay R200 processing fee to claim your reward.",
    ],
    [
      "impersonation",
      "I'm your son using a new number; I lost my phone.",
    ],
    [
      "mule_request",
      "Place an order on my behalf using your account.",
    ],
  ] as const)("uses tailored explanation steps for %s", (scamType, message) => {
    const result = analyseMessage(message);
    const explanation = explain(result, "en");

    expect(result.scamType).toBe(scamType);
    expect(result.band).not.toBe("low");
    expect(explanation.nextSteps).toEqual(english.steps[scamType]);
  });

  it("keeps reasons concise, deduplicated, and free of quoted user text", () => {
    const result = analyseMessage(
      "Please send your password so I can verify the account.",
    );
    const explanation = explain(result, "en");

    expect(explanation.reasons).toEqual([
      "The message appears to request a password, PIN, or one-time code.",
    ]);
    expect(explanation.reasons.join(" ")).not.toContain(
      result.signals[0].evidence ?? "",
    );
  });

  it("uses the selected locale's existing draft reason and steps", () => {
    const result = analyseMessage(
      "Place an order on my behalf using your account.",
      "pt",
    );
    const explanation = explain(result, "pt");

    expect(explanation.reasons).toEqual([
      "Alguém quer que faça uma encomenda em seu nome.",
    ]);
    expect(explanation.nextSteps).toEqual([
      "Não receba nem transfira dinheiro por outra pessoa.",
      "Não partilhe os dados da sua conta nem de pagamento.",
      "Se já transferiu dinheiro, contacte o seu banco pela aplicação ou por um número indicado no cartão.",
    ]);
  });
});
