export const SPIKE_MULTIPLIER = 3;
export const MIN_SPIKE_HISTORY = 3;
export const RAPID_COUNT = 3;
export const RAPID_MINUTES = 60;
export const RECENT_RISK_WINDOW_MINUTES = 60;
export const ODD_HOUR_START = 22;
export const ODD_HOUR_END = 6;

// Transaction.amount stays in major units; thresholds below use integer minor units.
export const MINOR_UNITS_PER_MAJOR_UNIT = {
  ZAR: 100,
  USD: 100,
} as const;

export const LARGE_TRANSACTION_LIMITS_MINOR_UNITS = {
  ZAR: 1_000_000, // R10,000.00
  USD: 100_000, // $1,000.00
} as const;

export const FEE_LIKE_SETTINGS = {
  currency: "ZAR",
  roundToMinorUnits: 5_000, // R50.00
  maxMinorUnits: 150_000, // R1,500.00
} as const;

export const TRANSACTION_SCORING_CONFIG = {
  signalWeights: {
    NEW_RECIPIENT: 0.2,
    AMOUNT_SPIKE: 0.35,
    FIRST_LARGE: 0.35,
    RAPID_REPEAT: 0.3,
    FEE_LIKE_AMOUNT: 0.2,
    ODD_HOUR: 0.15,
    RECENT_RISKY_MESSAGE: 0.4,
  },
} as const;

export const MESSAGE_SCORING_CONFIG = {
  bands: {
    lowMax: 24,
    mediumMax: 59,
  },
  signalWeights: {
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
    LOOKALIKE_LINK: 0.35,
    SHORTENED_LINK: 0.25,
  },
  signalWeight: {
    min: 0,
    max: 1,
  },
} as const;

export const LINK_ANALYSIS_CONFIG = {
  allowlistedDomains: [
    "absa.co.za",
    "capitec.co.za",
    "fnb.co.za",
    "mukuru.com",
    "nedbank.co.za",
    "sars.gov.za",
    "standardbank.co.za",
  ],
  brandTerms: [
    "mukuru",
    "capitec",
    "fnb",
    "absa",
    "nedbank",
    "standardbank",
    "ecocash",
    "mpesa",
    "safaricom",
    "vodacom",
    "mtn",
    "sassa",
  ],
  shortenedDomains: [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "cutt.ly",
    "rb.gy",
    "shorturl.at",
  ],
} as const;
