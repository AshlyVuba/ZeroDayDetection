import { readFile } from "node:fs/promises";

const requiredReasons = [
  "CREDENTIAL_REQUEST",
  "CREATE_ORDER_FOR_THEM",
  "UPFRONT_FEE",
  "ROMANCE_MONEY",
  "MONEY_REVERSAL",
  "PRIZE_WIN",
  "LOOKALIKE_LINK",
  "SECRECY",
  "TOO_GOOD_PAY",
  "IMPERSONATION",
  "RISKY_PAYMENT_METHOD",
  "SHORTENED_LINK",
  "URGENCY",
  "OFF_PLATFORM",
  "RECENT_RISKY_MESSAGE",
  "AMOUNT_SPIKE",
  "RAPID_REPEAT",
  "NEW_RECIPIENT",
  "FIRST_LARGE",
  "FEE_LIKE_AMOUNT",
  "ODD_HOUR",
];

const requiredScamTypes = [
  "job_scam",
  "phishing",
  "romance_scam",
  "mobile_money_reversal",
  "prize_scam",
  "impersonation",
  "mule_request",
];
const requiredBands = ["low", "medium", "high"];
const requiredGroups = ["band", "reason", "steps", "ui", "errors"];
const errors = [];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(group, requiredKeys) {
  if (!isRecord(group)) {
    errors.push("Expected a JSON object for a required string group.");
    return false;
  }

  for (const key of requiredKeys) {
    if (!Object.hasOwn(group, key)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  return true;
}

let strings;
try {
  strings = JSON.parse(
    await readFile(new URL("../src/i18n/en.json", import.meta.url), "utf8"),
  );
} catch (error) {
  console.error(`Could not read src/i18n/en.json: ${error.message}`);
  process.exit(1);
}

if (!isRecord(strings)) {
  console.error("Expected src/i18n/en.json to contain a JSON object.");
  process.exit(1);
}

for (const groupName of requiredGroups) {
  if (!Object.hasOwn(strings, groupName)) {
    errors.push(`Missing required group: ${groupName}`);
  } else if (!isRecord(strings[groupName])) {
    errors.push(`Expected "${groupName}" to be a JSON object.`);
  }
}

if (checkKeys(strings.band, requiredBands)) {
  for (const key of requiredBands) {
    if (typeof strings.band[key] !== "string" || !strings.band[key].trim()) {
      errors.push(`band.${key} must be a non-empty string.`);
    }
  }
}

if (checkKeys(strings.reason, requiredReasons)) {
  for (const key of requiredReasons) {
    const reason = strings.reason[key];
    if (typeof reason !== "string" || !reason.trim()) {
      errors.push(`reason.${key} must be a non-empty string.`);
      continue;
    }

    const wordCount = reason.trim().split(/\s+/u).length;
    if (wordCount > 15) {
      errors.push(`reason.${key} has ${wordCount} words; the limit is 15.`);
    }
    if (!/[.!?]$/u.test(reason) || /[.!?].+[.!?]/u.test(reason)) {
      errors.push(`reason.${key} must be one sentence.`);
    }
  }
}

if (checkKeys(strings.steps, requiredScamTypes)) {
  for (const key of requiredScamTypes) {
    const steps = strings.steps[key];
    if (!Array.isArray(steps) || steps.length < 2 || steps.length > 4) {
      errors.push(`steps.${key} must contain 2 to 4 next steps.`);
      continue;
    }
    if (steps.some((step) => typeof step !== "string" || !step.trim())) {
      errors.push(`steps.${key} must contain only non-empty strings.`);
    }
  }
}

for (const groupName of ["ui", "errors"]) {
  const group = strings[groupName];
  if (isRecord(group)) {
    if (Object.keys(group).length === 0) {
      errors.push(`"${groupName}" must contain at least one string.`);
    }
    for (const [key, value] of Object.entries(group)) {
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`${groupName}.${key} must be a non-empty string.`);
      }
    }
  }
}

const allCopy = JSON.stringify(strings);
if (/\bsafe\b/iu.test(allCopy)) {
  errors.push('English copy must not contain the word "safe".');
}
if (/scam shield/iu.test(allCopy)) {
  errors.push('English copy must use "ZeroDay Detection", not "Scam Shield".');
}

if (errors.length > 0) {
  console.error(`English string validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `English strings are complete: ${requiredReasons.length} reasons, ${requiredScamTypes.length} step sets, ${requiredBands.length} bands.`,
);
