import { MINOR_UNITS_PER_MAJOR_UNIT } from "./config";

export function normalizeRecipientId(recipientId: string): string {
  const trimmedId = recipientId.trim();

  if (!trimmedId) {
    throw new RangeError("Recipient ID must not be empty.");
  }

  if (!/^[+\d\s().-]+$/.test(trimmedId)) {
    return trimmedId;
  }

  const digits = trimmedId.replace(/\D/g, "");
  if (!digits) {
    throw new RangeError("Recipient phone ID must contain digits.");
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

export function medianLastN(values: readonly number[], lastN: number): number | undefined {
  if (!Number.isInteger(lastN) || lastN < 1) {
    throw new RangeError("lastN must be a positive integer.");
  }

  const sample = values.slice(-lastN);
  if (sample.length === 0) {
    return undefined;
  }

  if (sample.some((value) => !Number.isFinite(value))) {
    throw new RangeError("Median values must be finite numbers.");
  }

  const sorted = [...sample].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function countWithin(
  timestamps: readonly number[],
  minutes: number,
  now: number,
): number {
  if (!Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(now)) {
    throw new RangeError("Minutes must be finite and non-negative; reference time must be finite.");
  }

  const windowStart = now - minutes * 60_000;
  return timestamps.filter((timestamp) => {
    if (!Number.isFinite(timestamp)) {
      throw new RangeError("Timestamps must be finite numbers.");
    }

    return timestamp >= windowStart && timestamp <= now;
  }).length;
}

export function isOddHour(timestamp: number): boolean {
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("Timestamp must be a finite number.");
  }

  const hour = Number(
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date(timestamp))
      .find((part) => part.type === "hour")?.value,
  );

  return hour < 6 || hour >= 22;
}

type SupportedCurrency = keyof typeof MINOR_UNITS_PER_MAJOR_UNIT;

export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError("Transaction amount must be a finite, non-negative number.");
  }

  if (!Object.hasOwn(MINOR_UNITS_PER_MAJOR_UNIT, currency)) {
    throw new RangeError(`Unsupported transaction currency: ${currency}`);
  }

  const factor = MINOR_UNITS_PER_MAJOR_UNIT[currency as SupportedCurrency];
  return Math.round(amount * factor);
}
