import type { Lang, RiskResult } from "./types";

export interface Explanation {
  headline: string;
  reasons: string[];
  nextSteps: string[];
}

const REASONS: Record<string, string> = {
  CREDENTIAL_REQUEST: "The message asks for a password, PIN, or one-time code.",
  CREATE_ORDER_FOR_THEM: "Someone asks you to use your account to place an order.",
  UPFRONT_FEE: "The request asks for a fee or deposit before money or work is provided.",
  ROMANCE_MONEY: "A personal or romantic contact asks for money or gifts.",
  MONEY_REVERSAL: "The sender claims a payment was made by mistake and asks for money back.",
  PRIZE_WIN: "The message says you won a prize or reward.",
  SECRECY: "The sender asks you to keep this request private.",
  TOO_GOOD_PAY: "The offer promises unusually high pay for little work.",
  IMPERSONATION: "The sender uses an unusual number or account while claiming to be someone you know.",
  RISKY_PAYMENT_METHOD: "The message asks for payment by a method that can be hard to reverse.",
  URGENCY: "The message pressures you to act quickly.",
  OFF_PLATFORM: "The sender asks you to continue the conversation on another service.",
  LOOKALIKE_LINK: "A link may imitate an official website. This check is a heuristic.",
  SHORTENED_LINK: "A shortened link hides the website address it will open.",
  NEW_RECIPIENT: "This is the first payment to this recipient in the available history.",
  AMOUNT_SPIKE: "This payment is much larger than recent payments in this currency.",
  FIRST_LARGE: "This is the first payment above the configured large-payment threshold.",
  RAPID_REPEAT: "Several payments to this recipient happened within a short time.",
  FEE_LIKE_AMOUNT: "This amount matches a common fee-sized payment pattern.",
  ODD_HOUR: "The payment is scheduled during an unusual local hour.",
  RECENT_RISKY_MESSAGE: "A recent message check found warning signs related to this payment.",
};

export function explain(result: RiskResult, _lang: Lang): Explanation {
  const headline =
    result.band === "high"
      ? "Pause. Do not pay or share codes yet."
      : result.band === "medium"
        ? "Pause and check this request."
        : "No clear warning signs were found.";
  const reasons = result.signals.flatMap((signal) => {
    const reason = REASONS[signal.id];
    if (reason === undefined) return [];
    return [
      signal.evidence === undefined
        ? reason
        : `${reason} Evidence: ${signal.evidence}`,
    ];
  });
  const nextSteps =
    result.band === "high"
      ? [
          "Do not pay or share codes. Contact the organisation through a contact method you find independently.",
        ]
      : [
          "Check the request with someone you trust using contact details you already know.",
        ];

  return {
    headline,
    reasons,
    nextSteps,
  };
}
