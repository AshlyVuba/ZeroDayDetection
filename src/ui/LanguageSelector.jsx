import React from "react";
import {
  createTranslator,
  isBetaLanguage,
  LANGUAGE_NAMES,
} from "../i18n/index.js";

export default function LanguageSelector({
  language = "en",
  onChange = () => {},
  t = createTranslator(language),
}) {
  const beta = isBetaLanguage(language);
  const betaLabel = t("ui.betaLabel");

  return (
    <div className="language-control">
      <label className="visually-hidden" htmlFor="language-selector">
        {t("ui.languageLabel")}
      </label>
      <select
        id="language-selector"
        className="language-select"
        value={language}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
          <option key={code} value={code}>
            {isBetaLanguage(code) ? `${name} — ${betaLabel}` : name}
          </option>
        ))}
      </select>
      {beta ? (
        <span className="language-beta" aria-label={betaLabel}>
          {betaLabel}
        </span>
      ) : null}
    </div>
  );
}
