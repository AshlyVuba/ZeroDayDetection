export const SPIKE_MULTIPLIER = 3;
export const RAPID_COUNT = 3;
export const RAPID_MINUTES = 60;

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
