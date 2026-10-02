import seeds from "./seeds.json";

export const REQUIRED_SIGNAL_IDS = [
  "UPFRONT_FEE",
  "CREDENTIAL_REQUEST",
  "URGENCY",
  "SECRECY",
  "PRIZE_WIN",
  "MONEY_REVERSAL",
  "RISKY_PAYMENT_METHOD",
  "OFF_PLATFORM",
] as const;

export type LexiconSignalId = (typeof REQUIRED_SIGNAL_IDS)[number];
export type LexiconLanguage =
  | "sn"
  | "nd"
  | "zu"
  | "pt"
  | "sw"
  | "en-code-switched";

export interface LexiconPhrase {
  text: string;
  signalId: LexiconSignalId;
  form: "phrase" | "stem";
  status: "unverified" | "verified";
  verifier: string;
}

export type ProductionLexiconPhrase = LexiconPhrase & {
  status: "verified";
  verifier: string;
};

export interface LanguageLexiconSeed {
  name: string;
  speakerReviewer: {
    required: true;
    name: string | null;
  };
  speakerAuthoredPhrasesRequired: boolean;
  starterPhrases: LexiconPhrase[];
  productionPhrases: ProductionLexiconPhrase[];
  coverage: {
    minimumVerifiedPhraseCount: number;
    verifiedPhraseCount: number;
    remainingVerifiedPhraseCount: number;
    coveredVerifiedSignalIds: LexiconSignalId[];
    missingVerifiedSignalIds: LexiconSignalId[];
    status: "blocked";
  };
  messageSamples: {
    requiredScamCount: 3;
    requiredHonestCount: 3;
    scam: string[];
    honest: string[];
    status: "blocked";
  };
}

export interface LanguageLexiconSeedFile {
  formatVersion: 1;
  source: string;
  requiredSignalIds: LexiconSignalId[];
  languages: Record<LexiconLanguage, LanguageLexiconSeed>;
}

export type GroupedLanguageLexicon<Phrase extends LexiconPhrase = LexiconPhrase> = Record<
  LexiconSignalId,
  Phrase[]
>;

export type GroupedLanguageLexicons<
  Phrase extends LexiconPhrase = LexiconPhrase,
> = Record<
  LexiconLanguage,
  GroupedLanguageLexicon<Phrase>
>;

const LANGUAGE_CODES: LexiconLanguage[] = [
  "sn",
  "nd",
  "zu",
  "pt",
  "sw",
  "en-code-switched",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSignalId(value: unknown): value is LexiconSignalId {
  return REQUIRED_SIGNAL_IDS.some((signalId) => signalId === value);
}

function isLexiconPhrase(value: unknown): value is LexiconPhrase {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    isSignalId(value.signalId) &&
    (value.form === "phrase" || value.form === "stem") &&
    (value.status === "unverified" || value.status === "verified") &&
    typeof value.verifier === "string"
  );
}

function isProductionPhrase(value: unknown): value is ProductionLexiconPhrase {
  return (
    isLexiconPhrase(value) &&
    value.status === "verified" &&
    value.verifier.trim().length > 0
  );
}

function isLanguageSeed(value: unknown): value is LanguageLexiconSeed {
  if (!isRecord(value) || !isRecord(value.speakerReviewer)) return false;
  if (!isRecord(value.coverage) || !isRecord(value.messageSamples)) return false;

  return (
    typeof value.name === "string" &&
    value.speakerReviewer.required === true &&
    (typeof value.speakerReviewer.name === "string" ||
      value.speakerReviewer.name === null) &&
    typeof value.speakerAuthoredPhrasesRequired === "boolean" &&
    Array.isArray(value.starterPhrases) &&
    value.starterPhrases.every(
      (phrase) => isLexiconPhrase(phrase) && phrase.status === "unverified",
    ) &&
    Array.isArray(value.productionPhrases) &&
    value.productionPhrases.every(isProductionPhrase) &&
    (value.productionPhrases.length === 0 ||
      (typeof value.speakerReviewer.name === "string" &&
        value.speakerReviewer.name.trim().length > 0)) &&
    typeof value.coverage.minimumVerifiedPhraseCount === "number" &&
    typeof value.coverage.verifiedPhraseCount === "number" &&
    typeof value.coverage.remainingVerifiedPhraseCount === "number" &&
    Array.isArray(value.coverage.coveredVerifiedSignalIds) &&
    value.coverage.coveredVerifiedSignalIds.every(isSignalId) &&
    Array.isArray(value.coverage.missingVerifiedSignalIds) &&
    value.coverage.missingVerifiedSignalIds.every(isSignalId) &&
    value.coverage.status === "blocked" &&
    value.messageSamples.requiredScamCount === 3 &&
    value.messageSamples.requiredHonestCount === 3 &&
    Array.isArray(value.messageSamples.scam) &&
    value.messageSamples.scam.every(
      (message): message is string => typeof message === "string",
    ) &&
    Array.isArray(value.messageSamples.honest) &&
    value.messageSamples.honest.every(
      (message): message is string => typeof message === "string",
    ) &&
    value.messageSamples.status === "blocked"
  );
}

export function isLanguageLexiconSeedFile(
  value: unknown,
): value is LanguageLexiconSeedFile {
  if (
    !isRecord(value) ||
    !isRecord(value.languages) ||
    value.formatVersion !== 1 ||
    typeof value.source !== "string" ||
    !Array.isArray(value.requiredSignalIds) ||
    value.requiredSignalIds.length !== REQUIRED_SIGNAL_IDS.length ||
    !value.requiredSignalIds.every(
      (signalId, index) => signalId === REQUIRED_SIGNAL_IDS[index],
    )
  ) {
    return false;
  }

  const languages = value.languages;
  const languageCodes = Object.keys(languages);
  return (
    languageCodes.length === LANGUAGE_CODES.length &&
    LANGUAGE_CODES.every(
      (languageCode) =>
        Object.hasOwn(languages, languageCode) &&
        isLanguageSeed(languages[languageCode]),
    )
  );
}

export function parseLanguageLexiconSeedFile(
  value: unknown,
): LanguageLexiconSeedFile {
  if (!isLanguageLexiconSeedFile(value)) {
    throw new TypeError("Invalid language lexicon seed file");
  }
  return value;
}

export function selectProductionPhrases(
  phrases: readonly LexiconPhrase[],
): ProductionLexiconPhrase[] {
  return phrases.filter(
    (phrase): phrase is ProductionLexiconPhrase =>
      phrase.status === "verified" && phrase.verifier.trim().length > 0,
  );
}

export const LANGUAGE_LEXICON_SEEDS = parseLanguageLexiconSeedFile(seeds);

function groupPhrasesBySignal<Phrase extends LexiconPhrase>(
  phrases: readonly Phrase[],
): GroupedLanguageLexicon<Phrase> {
  const grouped = Object.fromEntries(
    REQUIRED_SIGNAL_IDS.map((signalId) => [signalId, [] as Phrase[]]),
  ) as GroupedLanguageLexicon<Phrase>;

  for (const phrase of phrases) {
    if (isSignalId(phrase.signalId)) grouped[phrase.signalId].push(phrase);
  }
  return grouped;
}

function buildLanguageGroups<Phrase extends LexiconPhrase>(
  selectPhrases: (seed: LanguageLexiconSeed) => Phrase[],
): GroupedLanguageLexicons<Phrase> {
  const grouped = {} as GroupedLanguageLexicons<Phrase>;
  for (const languageCode of LANGUAGE_CODES) {
    grouped[languageCode] = groupPhrasesBySignal(
      selectPhrases(LANGUAGE_LEXICON_SEEDS.languages[languageCode]),
    );
  }
  return grouped;
}

export const PRODUCTION_LEXICON_BY_LANGUAGE =
  buildLanguageGroups<ProductionLexiconPhrase>((seed) =>
    seed.speakerReviewer.name?.trim()
      ? selectProductionPhrases(seed.productionPhrases)
      : [],
  );

export const UNVERIFIED_LEXICON_BY_LANGUAGE =
  buildLanguageGroups<LexiconPhrase>((seed) =>
    [...seed.starterPhrases, ...seed.productionPhrases].filter(
      (phrase) => phrase.status === "unverified",
    ),
  );
