import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const stringsPath = fileURLToPath(new URL("../src/i18n/en.json", import.meta.url));
const strings = JSON.parse(await readFile(stringsPath, "utf8"));

const messageSignals = [
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
];

const transactionSignals = [
  "RECENT_RISKY_MESSAGE",
  "AMOUNT_SPIKE",
  "RAPID_REPEAT",
  "NEW_RECIPIENT",
  "FIRST_LARGE",
  "FEE_LIKE_AMOUNT",
  "ODD_HOUR",
];

const scamTypes = [
  "job_scam",
  "phishing",
  "romance_scam",
  "mobile_money_reversal",
  "prize_scam",
  "impersonation",
  "mule_request",
];

const uiKeys = [
  "ui.app_name",
  "ui.tagline",
  "ui.message_input_label",
  "ui.message_input_placeholder",
  "ui.analyze_button",
  "ui.clear_button",
  "ui.result_heading",
  "ui.risk_score",
  "ui.risk_band",
  "ui.reasons_heading",
  "ui.next_steps_heading",
  "ui.language_label",
  "ui.privacy_note",
  "ui.disclaimer",
];

const errorKeys = [
  "errors.empty_message",
  "errors.analysis_failed",
  "errors.result_unavailable",
  "errors.copy_failed",
];

const requiredKeys = [
  "band.low",
  "band.medium",
  "band.high",
  ...messageSignals.map((signal) => `reason.${signal}`),
  ...transactionSignals.map((signal) => `reason.${signal}`),
  ...scamTypes.flatMap((scamType) =>
    [1, 2, 3].map((step) => `steps.${scamType}.${step}`),
  ),
  ...uiKeys,
  ...errorKeys,
];

const missingKeys = requiredKeys.filter(
  (key) => typeof strings[key] !== "string" || strings[key].trim() === "",
);

if (missingKeys.length > 0) {
  console.error(`Missing or empty string keys:\n${missingKeys.map((key) => `- ${key}`).join("\n")}`);
  process.exitCode = 1;
}

const reasonKeys = [...messageSignals, ...transactionSignals].map(
  (signal) => `reason.${signal}`,
);
const invalidReasons = reasonKeys.filter((key) => {
  const reason = strings[key];
  if (typeof reason !== "string" || reason.trim() === "") return false;
  const words = reason.trim().split(/\s+/);
  return words.length > 15 || !/[.!?]$/.test(reason.trim());
});

if (invalidReasons.length > 0) {
  console.error(
    `Reasons must be one sentence of no more than 15 words:\n${invalidReasons.map((key) => `- ${key}`).join("\n")}`,
  );
  process.exitCode = 1;
}

if (process.exitCode) {
  process.exit();
}

console.log(
  `Checked ${requiredKeys.length} required keys, including ${reasonKeys.length} signal reasons.`,
);
