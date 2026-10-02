import type { Lang, RiskResult } from "./types";
import english from "../i18n/en.json";
import northernNdebele from "../i18n/nd.json";
import portuguese from "../i18n/pt.json";
import shona from "../i18n/sn.json";
import swahili from "../i18n/sw.json";
import zulu from "../i18n/zu.json";

export interface Explanation {
  headline: string;
  reasons: string[];
  nextSteps: string[];
}

interface ExplanationCatalog {
  band: Record<RiskResult["band"], string>;
  reason: Record<string, string>;
  steps: Record<NonNullable<RiskResult["scamType"]>, string[]>;
}

const CATALOGS: Record<Lang, ExplanationCatalog> = {
  en: english,
  sn: shona,
  nd: northernNdebele,
  zu: zulu,
  pt: portuguese,
  sw: swahili,
};

export function explain(result: RiskResult, lang: Lang): Explanation {
  const catalog = CATALOGS[lang];
  const headline = catalog.band[result.band];
  const reasons = [
    ...new Set(
      result.signals.flatMap((signal) => {
        const reason = catalog.reason[signal.id];
        return reason === undefined ? [] : [reason];
      }),
    ),
  ];
  const nextSteps =
    result.band !== "low" && result.scamType !== undefined
      ? catalog.steps[result.scamType]
      : undefined;

  return {
    headline,
    reasons,
    nextSteps: nextSteps ?? [
      "Pause before acting on this request.",
      "Verify details through a source you find independently.",
      "Ask someone you trust to review it.",
    ],
  };
}
