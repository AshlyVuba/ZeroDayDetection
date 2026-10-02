# Translation draft review tracker

The Shona (`sn`), Northern Ndebele (`nd`), isiZulu (`zu`), Portuguese (`pt`),
and Swahili (`sw`) catalogs are machine-assisted drafts authored for this
preparation PR. They are **unreviewed Draft/Beta content, not final
translations and not production-ready**. No named speakers or reviewers have
verified them. Do not treat this work as completion of ZD-23.

`src/i18n/review-status.json` is the machine-readable status source for future
language-picker integration. It intentionally records an empty `reviewer` for
each locale, `speakerVerification: "pending"`, `textFit360px: "pending"`, and
`productionReady: false`. A picker should expose the Draft/Beta status and keep
English (`en`) as the fallback until a locale has completed review.

| Locale | Named reviewer | Status | Speaker verification | 360px text-fit |
| --- | --- | --- | --- | --- |
| Shona (`sn`) |  | Draft/Beta; unreviewed | Pending | Pending |
| Northern Ndebele (`nd`) |  | Draft/Beta; unreviewed | Pending | Pending |
| isiZulu (`zu`) |  | Draft/Beta; unreviewed | Pending | Pending |
| Portuguese (`pt`) |  | Draft/Beta; unreviewed | Pending | Pending |
| Swahili (`sw`) |  | Draft/Beta; unreviewed | Pending | Pending |

The language selector uses this manifest conservatively: a locale is marked
Beta unless the manifest explicitly records a reviewed translation that is
production-ready. Missing or unknown status is therefore never presented as
final. English is not listed in this translated-locale tracker and is also
marked Beta until an explicit reviewed status is recorded.

The language-selector integration uses native language names and localized
selector/Beta labels. Home screen copy remains English for now; it has not been
rewritten as part of this integration. `npm run check:i18n:missing` lists any
missing non-empty strings relative to the English catalog for all six locales.

Before removing beta status for any locale, a named fluent speaker/reviewer must
read every string aloud, correct the translation for meaning and natural usage,
and verify the rendered text fits at a 360px viewport. Record the reviewer and
completed checks in the status manifest only after those reviews are actually
done. Preserve common loanwords such as OTP, WhatsApp, and eWallet if they occur
in later source strings; do not substitute one local language's wording for
another.

Run `npm run validate:i18n` after changing catalogs or the status manifest. It
checks that all locale keys, nested objects, and array lengths match the English
source and that review gates remain uncompleted.
