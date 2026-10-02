import { MESSAGE_SCORING_CONFIG } from "./config";
import { scoreSignals } from "./score";
import { matchLinkSignals } from "./links";
import type { Lang, RiskResult, Signal } from "./types";
import {
  PRODUCTION_LEXICON_BY_LANGUAGE,
  REQUIRED_SIGNAL_IDS,
  type LexiconLanguage,
  type ProductionLexiconPhrase,
} from "../lexicon";

const ZERO_WIDTH_CHARACTERS = /[\u180e\u200b-\u200d\u2060\ufeff]/gu;
const MARKS = /\p{M}/gu;
const WHITESPACE = /\s+/gu;

export interface NormalizedMessage {
  text: string;
  accentStripped: string;
  sourceIndices: number[];
}

export interface Rule {
  id: keyof typeof MESSAGE_SCORING_CONFIG.signalWeights;
  weight: number;
  test: (normalized: NormalizedMessage, original: string) => string | null;
}

function createSourceIndexMap(original: string): number[] {
  const sourceIndices: number[] = [];
  const segments = original.match(/\P{M}\p{M}*|\p{M}+/gu) ?? [];
  let sourceIndex = 0;
  let pendingWhitespace: number | undefined;
  let hasOutput = false;

  for (const segment of segments) {
    const normalizedSegment = segment
      .normalize("NFKC")
      .toLowerCase()
      .replace(ZERO_WIDTH_CHARACTERS, "");

    for (const character of normalizedSegment) {
      if (/\s/u.test(character)) {
        pendingWhitespace ??= sourceIndex;
        continue;
      }

      if (pendingWhitespace !== undefined && hasOutput) {
        sourceIndices.push(pendingWhitespace);
      }
      pendingWhitespace = undefined;
      for (let unit = 0; unit < character.length; unit += 1) {
        sourceIndices.push(sourceIndex);
      }
      hasOutput = true;
    }

    sourceIndex += Array.from(segment).length;
  }

  return sourceIndices;
}

export function normalizeMessage(original: string): NormalizedMessage {
  const text = original
    .normalize("NFKC")
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .toLowerCase()
    .replace(WHITESPACE, " ")
    .trim();
  let sourceIndices = createSourceIndexMap(original);
  if (sourceIndices.length !== text.length) {
    const sourceLength = Array.from(original).length;
    sourceIndices = Array.from(text, (_, index) =>
      Math.min(
        sourceLength - 1,
        Math.floor((index * sourceLength) / Math.max(text.length, 1)),
      ),
    );
  }

  const accentStrippedCharacters: string[] = [];
  const accentStrippedSourceIndices: number[] = [];
  for (let index = 0; index < text.length; ) {
    const character = String.fromCodePoint(text.codePointAt(index) ?? 0);
    const sourceIndex = sourceIndices[index] ?? 0;
    for (const unaccentedCharacter of character
      .normalize("NFD")
      .replace(MARKS, "")) {
      accentStrippedCharacters.push(unaccentedCharacter);
      for (let unit = 0; unit < unaccentedCharacter.length; unit += 1) {
        accentStrippedSourceIndices.push(sourceIndex);
      }
    }
    index += character.length;
  }

  return {
    text,
    accentStripped: accentStrippedCharacters.join(""),
    sourceIndices: accentStrippedSourceIndices,
  };
}

function evidenceForMatch(
  match: RegExpExecArray,
  normalized: NormalizedMessage,
  original: string,
): string {
  const originalCharacters = Array.from(original);
  const start = normalized.sourceIndices[match.index] ?? 0;
  const end =
    normalized.sourceIndices[
      Math.max(match.index, match.index + match[0].length - 1)
    ] ?? start;
  const startWithContext = Math.max(0, start - 10);
  const endWithContext = Math.min(
    originalCharacters.length,
    Math.max(end + 1, startWithContext + 40),
  );
  const snippetStart = Math.max(0, endWithContext - 40);

  return originalCharacters
    .slice(snippetStart, Math.min(endWithContext, snippetStart + 40))
    .join("");
}

function firstEvidence(
  patterns: readonly RegExp[],
  normalized: NormalizedMessage,
  original: string,
): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(normalized.accentStripped);
    if (match === null) continue;
    const precedingText = normalized.accentStripped.slice(
      Math.max(0, match.index - 24),
      match.index,
    );
    if (/(?:never|don't|do not|avoid)\s+[^.!?]*$/u.test(precedingText)) {
      continue;
    }
    return evidenceForMatch(match, normalized, original);
  }
  return null;
}

function normalizeLexiconText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(MARKS, "")
    .replace(WHITESPACE, " ")
    .trim();
}

function compileLexiconPhrase(phrase: ProductionLexiconPhrase): RegExp | null {
  const text = normalizeLexiconText(phrase.text);
  if (text.length === 0 || (phrase.form === "stem" && /\s/u.test(text))) {
    return null;
  }

  const escaped = text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern =
    phrase.form === "stem"
      ? escaped
      : String.raw`(?<![\p{L}\p{N}_])${escaped}(?![\p{L}\p{N}_])`;
  return new RegExp(pattern, "u");
}

interface CompiledLexiconPhrase {
  pattern: RegExp;
}

type CompiledLexiconByLanguage = Record<
  LexiconLanguage,
  Record<(typeof REQUIRED_SIGNAL_IDS)[number], CompiledLexiconPhrase[]>
>;

const COMPILED_PRODUCTION_LEXICON = Object.fromEntries(
  Object.entries(PRODUCTION_LEXICON_BY_LANGUAGE).map(
    ([language, signalGroups]) => [
      language,
      Object.fromEntries(
        REQUIRED_SIGNAL_IDS.map((signalId) => [
          signalId,
          signalGroups[signalId]
            .map((phrase) => {
              const pattern = compileLexiconPhrase(phrase);
              return pattern === null ? null : { pattern };
            })
            .filter(
              (compiled): compiled is CompiledLexiconPhrase =>
                compiled !== null,
            ),
        ]),
      ),
    ],
  ),
) as CompiledLexiconByLanguage;

const LEXICON_LANGUAGE_ORDER: LexiconLanguage[] = [
  "sn",
  "nd",
  "zu",
  "pt",
  "sw",
  "en-code-switched",
];

const ACTIVE_LEXICON_LANGUAGES = LEXICON_LANGUAGE_ORDER.filter((language) =>
  REQUIRED_SIGNAL_IDS.some(
    (signalId) =>
      COMPILED_PRODUCTION_LEXICON[language][signalId].length > 0,
  ),
);

function preferredLexiconLanguage(lang?: Lang): LexiconLanguage | undefined {
  return lang === "en" ? "en-code-switched" : lang;
}

interface LexiconSignalMatch {
  signal: Signal;
  language: LexiconLanguage;
}

function matchVerifiedLexiconSignals(
  normalized: NormalizedMessage,
  original: string,
  selectedLanguage?: LexiconLanguage,
): LexiconSignalMatch[] {
  if (ACTIVE_LEXICON_LANGUAGES.length === 0) return [];

  const languageOrder = selectedLanguage
    ? [
        selectedLanguage,
        ...ACTIVE_LEXICON_LANGUAGES.filter(
          (language) => language !== selectedLanguage,
        ),
      ]
    : ACTIVE_LEXICON_LANGUAGES;
  const matches = new Map<
    (typeof REQUIRED_SIGNAL_IDS)[number],
    LexiconSignalMatch
  >();

  for (const language of languageOrder) {
    for (const signalId of REQUIRED_SIGNAL_IDS) {
      if (matches.has(signalId)) continue;
      for (const { pattern } of COMPILED_PRODUCTION_LEXICON[language][
        signalId
      ]) {
        const evidence = firstEvidence([pattern], normalized, original);
        if (evidence === null) continue;
        matches.set(signalId, {
          language,
          signal: {
            id: signalId,
            weight: MESSAGE_SCORING_CONFIG.signalWeights[signalId],
            evidence,
          },
        });
        break;
      }
    }
  }
  return [...matches.values()];
}

function rule(
  id: Rule["id"],
  patterns: readonly RegExp[],
): Rule {
  return {
    id,
    weight: MESSAGE_SCORING_CONFIG.signalWeights[id],
    test: (normalized, original) =>
      firstEvidence(patterns, normalized, original),
  };
}

const MONEY =
  String.raw`(?:\b(?:r|zar)\s?\d{1,7}(?:[.,]\d{1,2})?|\$\s?\d{1,7}(?:[.,]\d{1,2})?|\b\d{1,7}(?:[.,]\d{1,2})?\s?(?:rand|zar)\b)`;
const MONEY_CONTEXT =
  String.raw`(?:${MONEY}[^.!?]{0,25}\b(?:fee|pay|deposit|admin|registration|processing)\b|\b(?:fee|pay|deposit|admin|registration|processing)\b[^.!?]{0,25}${MONEY})`;

export const MESSAGE_RULES: readonly Rule[] = [
  rule("CREDENTIAL_REQUEST", [
    /\b(?:send|share|provide|give|confirm|verify|enter|reply with|tell me)\b[^.!?]{0,45}\b(?:(?:your|the) )?(?:password|passcode|one[- ]time (?:password|code|pin)|otp|pin|login code|verification code|sign[- ]in details|banking details|card number|cvv)\b/u,
    /\b(?:password|passcode|otp|pin|login code|verification code|sign[- ]in details|banking details|card number|cvv)\b[^.!?]{0,40}\b(?:so i can|to)\b[^.!?]{0,20}\b(?:verify|confirm|unlock|secure)\b/u,
  ]),
  rule("CREATE_ORDER_FOR_THEM", [
    /\b(?:place|create|make)\s+(?:an? )?order\s+(?:for me|on my behalf)\b/u,
    /\b(?:buy|purchase)\b[^.!?]{0,25}\b(?:items?|goods?|products?|supplies?|groceries|order|package|parcel)\b[^.!?]{0,25}\b(?:for me|on my behalf|using your account)\b/u,
  ]),
  rule("UPFRONT_FEE", [
    new RegExp(MONEY_CONTEXT, "u"),
    /\b(?:pay|send|transfer)\b[^.!?]{0,20}\b(?:a|the) (?:registration|admin|processing) fee\b/u,
  ]),
  rule("ROMANCE_MONEY", [
    /\b(?:met you online|met online|dating app|online relationship|online partner|girlfriend|boyfriend|my love)\b[\s\S]{0,100}\b(?:send|lend|borrow|transfer|pay|buy|help me with)\b[\s\S]{0,30}\b(?:money|cash|rent|bill|medical|gift cards?)\b/u,
    /\b(?:send|lend|borrow|transfer|pay|buy|help me with)\b[\s\S]{0,30}\b(?:money|cash|rent|bill|medical|gift cards?)\b[\s\S]{0,100}\b(?:met online|dating app|online relationship|online partner|girlfriend|boyfriend|my love)\b/u,
  ]),
  rule("MONEY_REVERSAL", [
    /\b(?:sent|transferred|paid)\b[^.!?]{0,35}\b(?:by mistake|accidentally|twice|too much)\b[^.!?]{0,35}\b(?:send it back|return|refund|pay back)\b/u,
    /\b(?:payment|money|transfer)\b[^.!?]{0,30}\b(?:reversed|sent twice|came through twice|extra)\b[^.!?]{0,30}\b(?:return|refund|send back)\b/u,
  ]),
  rule("PRIZE_WIN", [
    /\b(?:you have won|you won|congratulations,? (?:you are a )?winner|claim your (?:prize|reward|winnings))\b/u,
    /\b(?:winner|prize|reward)\b[^.!?]{0,30}\b(?:claim|collect|won)\b/u,
  ]),
  rule("SECRECY", [
    /\b(?:keep|stay|remain)\b[^.!?]{0,20}\b(?:this )?(?:secret|confidential|private|between us)\b/u,
    /\b(?:don't|do not|never)\s+tell\s+(?:anyone|anybody|them|your family|the bank)\b/u,
  ]),
  rule("TOO_GOOD_PAY", [
    /\b(?:earn|make|get paid)\b[^.!?]{0,25}(?:\$\s?(?:\d{1,3}(?:,\d{3})+|\d{3,})(?:\.\d{1,2})?|\b(?:r\s?)?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\s?(?:rand|zar)?\b|\b(?:r\s?)?\d{3,}\s?(?:rand|zar)?\b|\b\d{3,}\s?per (?:hour|day)\b)[^.!?]{0,35}\b(?:easy|simple|few hours|no experience|little work)\b/u,
    /\b(?:high salary|huge pay|unusually high pay)\b[^.!?]{0,35}\b(?:easy|simple|few hours|no experience|little work)\b/u,
  ]),
  rule("IMPERSONATION", [
    /\b(?:new number|different number|lost my phone|personal (?:whatsapp|number)|unofficial (?:number|account)|using another number)\b/u,
  ]),
  rule("RISKY_PAYMENT_METHOD", [
    /\b(?:please )?(?:send|pay|transfer|buy|use)\b[^.!?]{0,25}\b(?:bitcoin|crypto(?:currency)?|gift cards?|vouchers?|prepaid cards?|wire transfer|cash app|e-?wallet|mobile money|ecocash)\b/u,
    /\b(?:bitcoin|crypto(?:currency)?|gift cards?|vouchers?|prepaid cards?|wire transfer|cash app|e-?wallet|mobile money|ecocash)\b[^.!?]{0,25}\b(?:payment|pay|send|transfer|deposit)\b/u,
  ]),
  rule("URGENCY", [
    /\b(?:act now|immediately|right away|urgent|today only|within \d{1,3} minutes|before (?:it is )?too late)\b/u,
    /\b(?:account|offer|access)\b[^.!?]{0,25}\b(?:will be|is being) (?:locked|blocked|closed|removed)\b/u,
  ]),
  rule("OFF_PLATFORM", [
    /\b(?:message|text|contact|call|chat with) me\b[^.!?]{0,20}\b(?:on|via|through)\s+(?:whatsapp|telegram|signal|personal email)\b/u,
    /\b(?:move|continue|take)\b[^.!?]{0,20}\b(?:this|our|the) (?:chat|conversation|discussion)\b[^.!?]{0,20}\b(?:whatsapp|telegram|signal|personal email)\b/u,
    /\bjoin\b[^.!?]{0,25}\b(?:our|the|a)?\s?(?:whatsapp|telegram|signal)\s+(?:group|chat)\b/u,
  ]),
].map((messageRule) => {
  if (messageRule.id !== "IMPERSONATION") return messageRule;

  return {
    ...messageRule,
    test: (normalized: NormalizedMessage, original: string) => {
      const text = normalized.accentStripped;
      const hasUnofficialContactCue =
        /\b(?:new number|different number|lost my phone|personal (?:whatsapp|number)|unofficial (?:number|account)|using another number)\b/u.test(
          text,
        );
      const identityClaim =
        /\b(?:i am|i'm|it's|this is)\s+(?:your (?:son|daughter|mother|father|brother|sister|boss|friend|bank)|(?:from|with) (?:your )?(?:bank|employer|company|support team))\b/u.exec(
          text,
        );
      if (!hasUnofficialContactCue || identityClaim === null) return null;
      return evidenceForMatch(identityClaim, normalized, original);
    },
  };
});

export function matchMessageSignals(text: string, lang?: Lang): Signal[] {
  const normalized = normalizeMessage(text);
  const preferredLanguage = preferredLexiconLanguage(lang);
  const signals = new Map<string, Signal>();

  for (const messageRule of MESSAGE_RULES) {
    const evidence = messageRule.test(normalized, text);
    if (evidence !== null) {
      signals.set(messageRule.id, {
        id: messageRule.id,
        weight: messageRule.weight,
        evidence,
      });
    }
  }

  for (const { language, signal } of matchVerifiedLexiconSignals(
    normalized,
    text,
    preferredLanguage,
  )) {
    if (!signals.has(signal.id) || language === preferredLanguage) {
      signals.set(signal.id, signal);
    }
  }
  for (const signal of matchLinkSignals(text)) {
    if (!signals.has(signal.id)) signals.set(signal.id, signal);
  }
  return [...signals.values()];
}

export function analyseMessage(text: string, lang?: Lang): RiskResult {
  return scoreSignals(matchMessageSignals(text, lang));
}
