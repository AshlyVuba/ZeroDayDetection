import { describe, expect, it } from "vitest";
import {
  LANGUAGE_LEXICON_SEEDS,
  REQUIRED_SIGNAL_IDS,
  isLanguageLexiconSeedFile,
  parseLanguageLexiconSeedFile,
  selectProductionPhrases,
} from "../src/lexicon";

describe("language lexicon seeds", () => {
  it("matches the documented TypeScript-safe data shape", () => {
    expect(isLanguageLexiconSeedFile(LANGUAGE_LEXICON_SEEDS)).toBe(true);
    expect(parseLanguageLexiconSeedFile(LANGUAGE_LEXICON_SEEDS)).toBe(
      LANGUAGE_LEXICON_SEEDS,
    );
    expect(() => parseLanguageLexiconSeedFile({})).toThrow(
      "Invalid language lexicon seed file",
    );
  });

  it("keeps all playbook starters unverified and out of production", () => {
    for (const language of Object.values(LANGUAGE_LEXICON_SEEDS.languages)) {
      expect(language.productionPhrases).toEqual([]);
      expect(selectProductionPhrases(language.starterPhrases)).toEqual([]);
      expect(language.starterPhrases.every(
        (phrase) => phrase.status === "unverified" && phrase.verifier === "",
      )).toBe(true);
    }
  });

  it("rejects a seed phrase if it is placed in a production list", () => {
    const swahili = LANGUAGE_LEXICON_SEEDS.languages.sw;
    const invalidCandidate = {
      ...LANGUAGE_LEXICON_SEEDS,
      languages: {
        ...LANGUAGE_LEXICON_SEEDS.languages,
        sw: {
          ...swahili,
          productionPhrases: [swahili.starterPhrases[0]],
        },
      },
    };

    expect(isLanguageLexiconSeedFile(invalidCandidate)).toBe(false);
    expect(() => parseLanguageLexiconSeedFile(invalidCandidate)).toThrow(
      "Invalid language lexicon seed file",
    );
  });

  it("requires a named verifier before a phrase can be selected", () => {
    const unverified = {
      text: "seed",
      signalId: "URGENCY",
      form: "phrase",
      status: "unverified",
      verifier: "",
    } as const;
    const verifiedWithoutName = {
      ...unverified,
      status: "verified",
    } as const;
    const verifiedWithName = {
      ...verifiedWithoutName,
      verifier: "Named fluent reviewer",
    } as const;

    expect(selectProductionPhrases([unverified])).toEqual([]);
    expect(selectProductionPhrases([verifiedWithoutName])).toEqual([]);
    expect(selectProductionPhrases([verifiedWithName])).toEqual([
      verifiedWithName,
    ]);
  });

  it("records exact supplied starters and blocks unfinished coverage and samples", () => {
    const { languages } = LANGUAGE_LEXICON_SEEDS;

    expect(
      Object.fromEntries(
        Object.entries(languages).map(([code, language]) => [
          code,
          language.starterPhrases.map(({ text }) => text),
        ]),
      ),
    ).toEqual({
      sn: ["tumira mari", "wakunda"],
      nd: [],
      zu: ["thumela imali", "ngokushesha", "uwinile"],
      pt: ["pague uma taxa", "urgente", "ganhou", "não conte a ninguém"],
      sw: [
        "tuma pesa",
        "haraka",
        "namba ya siri",
        "nimetuma kwa makosa",
        "umeshinda",
      ],
      "en-code-switched": [],
    });

    expect(languages.nd.starterPhrases).toEqual([]);
    expect(languages.nd.speakerAuthoredPhrasesRequired).toBe(true);
    expect(languages["en-code-switched"].starterPhrases).toEqual([]);

    for (const language of Object.values(languages)) {
      expect(language.speakerReviewer).toEqual({
        required: true,
        name: null,
      });
      expect(language.coverage.minimumVerifiedPhraseCount).toBe(8);
      expect(language.coverage.verifiedPhraseCount).toBe(0);
      expect(language.coverage.remainingVerifiedPhraseCount).toBe(8);
      expect(language.coverage.coveredVerifiedSignalIds).toEqual([]);
      expect(language.coverage.missingVerifiedSignalIds).toEqual(
        [...REQUIRED_SIGNAL_IDS],
      );
      expect(language.coverage.status).toBe("blocked");
      expect(language.messageSamples).toEqual({
        requiredScamCount: 3,
        requiredHonestCount: 3,
        scam: [],
        honest: [],
        status: "blocked",
      });
    }
  });
});
