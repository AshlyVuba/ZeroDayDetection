import { describe, expect, it } from "vitest";
import {
  analyseMessage,
  matchMessageSignals,
  MESSAGE_RULES,
  normalizeMessage,
  type Signal,
} from "../src/engine";

const positiveExamples: Record<string, string[]> = {
  CREDENTIAL_REQUEST: [
    "Please send your password so I can verify the account.",
    "Reply with the OTP to unlock your login.",
  ],
  CREATE_ORDER_FOR_THEM: [
    "Place an order on my behalf using your account.",
    "Could you buy these items for me and ship them?",
  ],
  UPFRONT_FEE: [
    "Pay R450 as a registration fee before your first shift.",
    "Send ZAR 500 for the admin deposit before we release it.",
  ],
  ROMANCE_MONEY: [
    "My online partner needs me to send money for rent.",
    "We met on a dating app; please transfer cash for my medical bill.",
  ],
  MONEY_REVERSAL: [
    "I sent it by mistake, please return the extra money.",
    "The payment came through twice; refund the extra.",
  ],
  PRIZE_WIN: [
    "You have won a prize; claim your reward now.",
    "Congratulations, you are a winner!",
  ],
  SECRECY: [
    "Keep this request secret and between us.",
    "Don't tell anyone about this transfer.",
  ],
  TOO_GOOD_PAY: [
    "Earn $5,000 a day for easy work with no experience.",
    "Earn R5,000 a week working from home, no experience.",
    "High salary for a few hours of simple work.",
  ],
  IMPERSONATION: [
    "I'm your son using a new number; I lost my phone.",
    "This is your bank from an unofficial number.",
  ],
  RISKY_PAYMENT_METHOD: [
    "Please buy gift cards and send me the codes.",
    "Pay R450 admin fee via eWallet.",
    "Pay the deposit using Bitcoin.",
  ],
  URGENCY: [
    "Act now or your account will be locked.",
    "Send the code within 10 minutes before it is too late.",
  ],
  OFF_PLATFORM: [
    "Message me on WhatsApp to continue.",
    "Join our WhatsApp group.",
    "Move this conversation to Telegram.",
  ],
};

const negativeExamples: Record<string, string> = {
  CREDENTIAL_REQUEST: "Never share your password or login code with anyone.",
  CREATE_ORDER_FOR_THEM: "I placed my own order from the official shop.",
  UPFRONT_FEE: "No registration fee, deposit, or payment is required.",
  ROMANCE_MONEY: "We met online, but I never ask anyone for money.",
  MONEY_REVERSAL: "The payment arrived once and no refund is requested.",
  PRIZE_WIN: "I did not enter or win any prize.",
  SECRECY: "Tell someone you trust and keep the conversation open.",
  TOO_GOOD_PAY: "The hourly pay is listed clearly in the written job contract.",
  IMPERSONATION: "This message mentions Standard Bank by name.",
  RISKY_PAYMENT_METHOD: "I paid for groceries by bank transfer yesterday.",
  URGENCY: "There is no hurry; reply whenever it is convenient.",
  OFF_PLATFORM: "Stay here; WhatsApp is mentioned only as an example.",
};

describe("English message rules", () => {
  it.each(Object.entries(positiveExamples))(
    "%s matches both positive examples with original evidence",
    (id, examples) => {
      for (const message of examples) {
        const signal = matchMessageSignals(message).find(
          (candidate) => candidate.id === id,
        );

        expect(signal).toBeDefined();
        expect(signal?.evidence).toBeDefined();
        expect(signal?.evidence?.length).toBeLessThanOrEqual(40);
        expect(message.includes(signal?.evidence ?? "")).toBe(true);
        expect(signal?.weight).toBeGreaterThan(0);
      }
    },
  );

  it.each(Object.entries(negativeExamples))(
    "%s does not match its negative example",
    (id, message) => {
      expect(
        matchMessageSignals(message).some((signal) => signal.id === id),
      ).toBe(false);
    },
  );

  it("uses the registered playbook weights", () => {
    expect(
      Object.fromEntries(MESSAGE_RULES.map(({ id, weight }) => [id, weight])),
    ).toEqual({
      CREDENTIAL_REQUEST: 0.8,
      CREATE_ORDER_FOR_THEM: 0.6,
      UPFRONT_FEE: 0.55,
      ROMANCE_MONEY: 0.55,
      MONEY_REVERSAL: 0.5,
      PRIZE_WIN: 0.4,
      SECRECY: 0.3,
      TOO_GOOD_PAY: 0.3,
      IMPERSONATION: 0.3,
      RISKY_PAYMENT_METHOD: 0.3,
      URGENCY: 0.2,
      OFF_PLATFORM: 0.2,
    });
  });

  it.each([
    "Pay R450 before the order is released.",
    "The $50 registration fee is due before starting.",
    "Pay 500 rand as an admin deposit.",
    "Send ZAR 500 for the registration fee.",
  ])("matches upfront money format: %s", (message) => {
    expect(
      matchMessageSignals(message).some(
        (signal) => signal.id === "UPFRONT_FEE",
      ),
    ).toBe(true);
  });

  it.each([
    [
      "Case 1",
      "Congratulations! You are selected for a cleaning job in Cape Town. Pay R450 admin fee via eWallet to confirm your placement. Do not tell anyone.",
      ["UPFRONT_FEE", "SECRECY", "RISKY_PAYMENT_METHOD"],
    ],
    [
      "Case 2",
      "Dear customer, your account will be blocked in 24 hours. Verify now: bit.ly/x1 and enter your PIN.",
      ["CREDENTIAL_REQUEST", "SHORTENED_LINK", "URGENCY"],
    ],
    [
      "Case 3",
      "Hi, I sent R300 to your number by mistake, please send it back.",
      ["MONEY_REVERSAL"],
    ],
    [
      "Case 4",
      "Hi my love, I'm stuck at the airport. Please buy gift cards for me, I'll pay you back.",
      ["ROMANCE_MONEY", "RISKY_PAYMENT_METHOD"],
    ],
    [
      "Case 5",
      "Earn R5,000 a week working from home, no experience, join our WhatsApp group.",
      ["TOO_GOOD_PAY", "OFF_PLATFORM"],
    ],
    [
      "Case 6",
      "You won R50,000 in the airtime promo. Call to claim. Pay R200 processing.",
      ["PRIZE_WIN", "UPFRONT_FEE"],
    ],
    [
      "Case 7",
      "Can you create a Mukuru order with your account for me? I'll pay you cash.",
      [],
    ],
    [
      "Case 8",
      "Your interview is Monday 10am at 12 Main Road. Bring your ID and CV. No fees apply.",
      [],
    ],
    [
      "Case 9",
      "Your Mukuru transfer of R500 to Tendai was collected. Thank you.",
      [],
    ],
    ["Case 10", "Are you coming to church on Sunday?", []],
  ] as const)(
    "matches the canonical playbook %s fixture",
    (_caseName, message, expectedSignals) => {
      expect(
        matchMessageSignals(message)
          .map((signal) => signal.id)
          .sort(),
      ).toEqual([...expectedSignals].sort());
    },
  );
});

describe("message normalization and API", () => {
  it("applies NFKC, removes zero-width characters, folds whitespace, and strips accents", () => {
    expect(normalizeMessage("ＦＯＯ\tBar\u200b   café")).toMatchObject({
      text: "foo bar café",
      accentStripped: "foo bar cafe",
    });
  });

  it("keeps original text in bounded evidence after normalization", () => {
    const message = "ＰＡＹ R450 registration fee before starting.";
    const signal = matchMessageSignals(message).find(
      (candidate) => candidate.id === "UPFRONT_FEE",
    );

    expect(signal?.evidence).toBeDefined();
    expect(signal?.evidence?.length).toBeLessThanOrEqual(40);
    expect(message.includes(signal?.evidence ?? "")).toBe(true);
  });

  it("does not flag a brand name without an unofficial-contact cue", () => {
    expect(
      matchMessageSignals("Standard Bank sent me a statement.").some(
        (signal) => signal.id === "IMPERSONATION",
      ),
    ).toBe(false);
  });

  it.each([
    ["shortener with scheme", "Check https://bit.ly/abc.", ["SHORTENED_LINK"]],
    ["bare shortener domain", "Try bit.ly/abc now", ["SHORTENED_LINK"]],
    ["www shortener", "See www.tinyurl.com/offer", ["SHORTENED_LINK"]],
    [
      "brand in a non-allowlisted domain",
      "Open https://mukuru-secure.example/login",
      ["LOOKALIKE_LINK"],
    ],
    [
      "punycode hostname",
      "Open https://xn--80ak6aa92e.example/login",
      ["LOOKALIKE_LINK"],
    ],
    [
      "raw IP address",
      "Open http://192.0.2.10/login",
      ["LOOKALIKE_LINK"],
    ],
    [
      "non-HTTPS link with credential terms",
      "Open http://example.org/login and enter your PIN",
      ["LOOKALIKE_LINK"],
    ],
    [
      "uppercase shortener with trailing punctuation",
      "Use HTTPS://RB.GY/AbC,",
      ["SHORTENED_LINK"],
    ],
    ["allowlisted Mukuru domain", "https://mukuru.com/help", []],
    [
      "allowlisted Capitec subdomain",
      "https://secure.capitec.co.za/login",
      [],
    ],
    ["allowlisted FNB domain", "https://fnb.co.za", []],
    ["unusual TLD alone", "Visit https://example.xyz/offer", []],
    [
      "brand mention outside the URL",
      "Mukuru is mentioned here: https://example.org",
      [],
    ],
    [
      "HTTPS link with credential words",
      "Open https://example.net/login and enter your PIN",
      [],
    ],
  ] as const)(
    "matches URL signals for %s",
    (_name, message, expectedSignalIds) => {
      expect(
        matchMessageSignals(message)
          .filter((signal) =>
            ["LOOKALIKE_LINK", "SHORTENED_LINK"].includes(signal.id),
          )
          .map((signal) => signal.id)
          .sort(),
      ).toEqual([...expectedSignalIds].sort());
    },
  );

  it("keeps link evidence as bounded plain text without trailing punctuation", () => {
    const message = "Please check HTTPS://GOO.GL/abc).";
    const signal = matchMessageSignals(message).find(
      (candidate) => candidate.id === "SHORTENED_LINK",
    );

    expect(signal?.evidence).toBe("HTTPS://GOO.GL/abc");
    expect(signal?.evidence?.length).toBeLessThanOrEqual(40);
    expect(signal?.weight).toBe(0.25);
    expect(
      matchMessageSignals("https://mukuru-secure.example").find(
        (candidate) => candidate.id === "LOOKALIKE_LINK",
      )?.weight,
    ).toBe(0.35);
  });

  it("keeps analyseMessage's public result shape without scoring", () => {
    const result = analyseMessage(
      "Please send your password so I can verify the account.",
    );
    const signals: Signal[] = result.signals;

    expect(result).toMatchObject({
      score: 0,
      band: "low",
      signals: [{ id: "CREDENTIAL_REQUEST", weight: 0.8 }],
    });
    expect(signals).toHaveLength(1);
  });

  it("matches a 20,000-character message in under 50 ms", () => {
    const suffix = " You have won a prize!";
    const message = `${"x".repeat(20_000 - suffix.length)}${suffix}`;
    const samples: number[] = [];

    matchMessageSignals(message);
    matchMessageSignals(message);
    for (let iteration = 0; iteration < 7; iteration += 1) {
      const start = performance.now();
      matchMessageSignals(message);
      samples.push(performance.now() - start);
    }

    samples.sort((left, right) => left - right);
    expect(samples[3]).toBeLessThan(50);
  });
});
