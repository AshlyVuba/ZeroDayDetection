import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  applyLanguage,
  createTranslator,
  formatCurrency,
  formatNumber,
  getInitialLanguage,
  isBetaLanguage,
  persistLanguage,
  t,
} from "../src/i18n/index.js";
import LanguageSelector from "../src/ui/LanguageSelector.jsx";

describe("language selection and translations", () => {
  it("falls back to English strings and never displays an untranslated key", () => {
    const translateFromEmptyCatalog = createTranslator("sn", {});

    expect(translateFromEmptyCatalog("ui.appName")).toBe("ZeroDay Detection");
    expect(t("ui.missingKey", {}, "sn")).toBe("Text unavailable.");
  });

  it("uses stored language codes before the browser language and persists only a code", () => {
    const storedLanguage = { getItem: () => "pt" };
    expect(getInitialLanguage(storedLanguage, "zu-ZA")).toBe("pt");
    expect(getInitialLanguage({ getItem: () => null }, "pt-BR")).toBe("pt");

    const setItem = vi.fn();
    persistLanguage("sn", { setItem });
    expect(setItem).toHaveBeenCalledExactlyOnceWith("zeroday-language", "sn");
  });

  it("updates the document language attribute", () => {
    const documentRef = { documentElement: { lang: "en" } };

    applyLanguage("sw", documentRef);
    expect(documentRef.documentElement.lang).toBe("sw");
  });

  it("provides accessible native-name options and visibly marks beta locales", () => {
    const markup = renderToStaticMarkup(<LanguageSelector language="sn" />);

    expect(markup).toContain('<label class="visually-hidden" for="language-selector">Mutauro</label>');
    expect(markup).toContain('value="sn" selected="">chiShona — Beta</option>');
    expect(markup).toContain("isiNdebele — Beta");
    expect(markup).toContain("isiZulu — Beta");
    expect(markup).toContain("Português — Beta");
    expect(markup).toContain("Kiswahili — Beta");
    expect(markup).toContain('class="language-beta" aria-label="Beta">Beta</span>');
    expect(isBetaLanguage("unknown")).toBe(true);
  });

  it("notifies the selector change handler with the selected language code", () => {
    const onChange = vi.fn();
    const selector = LanguageSelector({ language: "en", onChange });
    const select = selector.props.children[1];

    select.props.onChange({ target: { value: "pt" } });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("pt");
  });

  it("formats numbers and currencies using Intl for the selected language", () => {
    expect(formatNumber(1234.5, "pt")).toBe(
      new Intl.NumberFormat("pt").format(1234.5),
    );
    expect(formatCurrency(12.5, "EUR", "pt")).toBe(
      new Intl.NumberFormat("pt", { style: "currency", currency: "EUR" }).format(12.5),
    );
  });
});
