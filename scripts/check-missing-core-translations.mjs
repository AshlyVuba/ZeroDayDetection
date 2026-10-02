import { readFile } from "node:fs/promises";

const localeCodes = ["en", "sn", "nd", "zu", "pt", "sw"];

async function readCatalog(locale) {
  return JSON.parse(
    await readFile(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8"),
  );
}

function stringPaths(value, path = "") {
  if (typeof value === "string") return [path];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    stringPaths(child, path ? `${path}.${key}` : key),
  );
}

function hasStringAtPath(value, path) {
  let current = value;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, part)) {
      return false;
    }
    current = current[part];
  }
  return typeof current === "string" && current.trim().length > 0;
}

const catalogs = Object.fromEntries(
  await Promise.all(localeCodes.map(async (locale) => [locale, await readCatalog(locale)])),
);
const corePaths = stringPaths(catalogs.en);
let hasMissingTranslations = false;

for (const locale of localeCodes) {
  const missing = corePaths.filter((path) => !hasStringAtPath(catalogs[locale], path));
  console.log(`${locale}: ${missing.length === 0 ? "none" : missing.join(", ")}`);
  hasMissingTranslations ||= missing.length > 0;
}

if (hasMissingTranslations) process.exitCode = 1;
