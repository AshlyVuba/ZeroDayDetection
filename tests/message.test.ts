import { describe, expect, it } from "vitest";
import {
  analyseMessage,
  matchMessageSignals,
  MESSAGE_RULES,
  normalizeMessage,
  type Lang,
  type Signal,
} from "../src/engine";
import { LANGUAGE_LEXICON_SEEDS } from "../src/lexicon";

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

  it("keeps unverified multilingual starter phrases out of message signals", () => {
    const languageCodes = [
      "sn",
      "nd",
      "zu",
      "pt",
      "sw",
      "en-code-switched",
    ] as const;
    for (const languageCode of languageCodes) {
      const language = LANGUAGE_LEXICON_SEEDS.languages[languageCode];
      const selectedLanguage = languageCode === "en-code-switched"
        ? "en"
        : languageCode;
      for (const phrase of language.starterPhrases) {
        expect(matchMessageSignals(phrase.text, selectedLanguage)).toEqual([]);
      }
    }
  });

  it("retains English signals in mixed-language messages without matching unverified phrases", () => {
    expect(
      matchMessageSignals(
        "thumela imali, please send your password so I can verify the account",
        "zu",
      ).map(({ id }) => id),
    ).toEqual(["CREDENTIAL_REQUEST"]);
  });

  it("keeps honest English negatives clear with a non-English language selected", () => {
    expect(
      matchMessageSignals(
        "Never share your password or login code with anyone.",
        "pt",
      ),
    ).toEqual([]);
  });

  it("scores matched message signals through the shared scorer", () => {
    const result = analyseMessage(
      "Please send your password so I can verify the account.",
    );
    const signals: Signal[] = result.signals;

    expect(result).toMatchObject({
      score: 80,
      band: "high",
      signals: [{ id: "CREDENTIAL_REQUEST", weight: 0.8 }],
    });
    expect(signals).toHaveLength(1);
  });

  it("matches a 20,000-character message in under 50 ms", () => {
    const suffix = " You have won a prize!";
    const message = `${"x".repeat(20_000 - suffix.length)}${suffix}`;
    const languages: Lang[] = ["en", "sn", "nd", "zu", "pt", "sw"];

    for (const language of languages) {
      const samples: number[] = [];
      matchMessageSignals(message, language);
      matchMessageSignals(message, language);
      for (let iteration = 0; iteration < 7; iteration += 1) {
        const start = performance.now();
        matchMessageSignals(message, language);
        samples.push(performance.now() - start);
      }

      samples.sort((left, right) => left - right);
      expect(samples[3], language).toBeLessThan(50);
    }
  });
});

describe("text-only URL checks", () => {
  it.each([
    ["known shortener", "Visit https://bit.ly/x1", "SHORTENED_LINK"],
    ["another shortener", "Visit tinyurl.com/pay", "SHORTENED_LINK"],
    ["lookalike spelling", "Visit https://capitac.co.za/login", "LOOKALIKE_LINK"],
    ["trusted name before a hostile suffix", "Visit https://capitec.co.za.evil.example/login", "LOOKALIKE_LINK"],
    ["punycode hostname", "Visit https://xn--pple-43d.com", "LOOKALIKE_LINK"],
    ["raw IPv4 host", "Visit http://192.168.1.4/login", "LOOKALIKE_LINK"],
    ["uppercase shortener and punctuation", "BIT.LY/x1!", "SHORTENED_LINK"],
  ])("flags %s without resolving the URL", (_name, text, expectedSignal) => {
    expect(matchMessageSignals(text).map(({ id }) => id)).toContain(
      expectedSignal,
    );
  });

  it.each([
    "https://mukuru.com/",
    "https://capitec.co.za/login",
    "https://absa.co.za/",
    "https://nedbank.co.za/",
    "https://online.standardbank.co.za/",
    "https://www.fnb.co.za.",
    "https://sars.gov.za/",
    "https://example.com/",
  ])("does not flag an official or ordinary domain: %s", (text) => {
    expect(matchMessageSignals(text)).toEqual([]);
  });
});
