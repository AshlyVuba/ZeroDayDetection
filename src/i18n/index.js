import english from "./en.json";
import northernNdebele from "./nd.json";
import portuguese from "./pt.json";
import shona from "./sn.json";
import swahili from "./sw.json";
import zulu from "./zu.json";
import reviewStatus from "./review-status.json";

export const LANGUAGE_NAMES = Object.freeze({
  en: "English",
  sn: "chiShona",
  nd: "isiNdebele",
  zu: "isiZulu",
  pt: "Português",
  sw: "Kiswahili",
});

const catalogs = Object.freeze({
  en: english,
  sn: shona,
  nd: northernNdebele,
  zu: zulu,
  pt: portuguese,
  sw: swahili,
});

const intlLocales = Object.freeze({
  en: "en",
  sn: "sn",
  nd: "nd",
  zu: "zu",
  pt: "pt",
  sw: "sw",
});

const availableLanguages = new Set(Object.keys(LANGUAGE_NAMES));

export function normalizeLanguage(language) {
  if (typeof language !== "string") return "en";
  const baseLanguage = language.trim().toLowerCase().split(/[-_]/u, 1)[0];
  return availableLanguages.has(baseLanguage) ? baseLanguage : "en";
}

function readLanguage(storage) {
  const storedLanguage = storage?.getItem("zeroday-language");
  if (typeof storedLanguage !== "string") return null;
  const normalized = storedLanguage.trim().toLowerCase();
  return availableLanguages.has(normalized) ? normalized : null;
}

export function getInitialLanguage(
  storage = globalThis.localStorage,
  browserLanguage = globalThis.navigator?.language,
) {
  return readLanguage(storage) ?? normalizeLanguage(browserLanguage);
}

export function persistLanguage(language, storage = globalThis.localStorage) {
  if (!availableLanguages.has(language)) {
    throw new RangeError(`Unsupported language code: ${language}`);
  }
  storage.setItem("zeroday-language", language);
}

export function applyLanguage(language, documentRef = globalThis.document) {
  if (!availableLanguages.has(language)) {
    throw new RangeError(`Unsupported language code: ${language}`);
  }
  if (!documentRef?.documentElement) {
    throw new Error("The document element is not available.");
  }
  documentRef.documentElement.lang = language;
}

function lookup(dictionary, key) {
  if (typeof key !== "string") return undefined;
  let value = dictionary;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) {
      return undefined;
    }
    value = value[part];
  }
  return typeof value === "string" ? value : undefined;
}

function translate(key, vars, dictionary, fallback = english) {
  const template = lookup(dictionary, key) ?? lookup(fallback, key);
  const unavailable = lookup(english, "ui.textUnavailable") ?? "Text unavailable.";
  if (template === undefined) return unavailable;

  return template.replace(/\{([^{}]+)\}/gu, (placeholder, name) => (
    vars !== null && typeof vars === "object" && Object.hasOwn(vars, name)
      ? String(vars[name])
      : ""
  ));
}

export function t(key, vars = {}, language = "en") {
  const catalog = catalogs[normalizeLanguage(language)];
  return translate(key, vars, catalog);
}

export function createTranslator(language, dictionary = catalogs[normalizeLanguage(language)]) {
  return (key, vars = {}) => translate(key, vars, dictionary);
}

export function isBetaLanguage(language) {
  const status = reviewStatus[language];
  return !(
    status?.status === "Reviewed"
    && status?.translationReview === "reviewed"
    && status?.productionReady === true
  );
}

export function formatNumber(value, language, options = {}) {
  const locale = intlLocales[normalizeLanguage(language)];
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(value, currency, language) {
  const locale = intlLocales[normalizeLanguage(language)];
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
