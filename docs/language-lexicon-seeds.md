# Language lexicon seed data

`src/lexicon/seeds.json` is a JSON-compatible input format for language phrase
review. `src/lexicon/index.ts` loads all six language sections (`sn`, `nd`,
`zu`, `pt`, `sw`, and `en-code-switched`) and groups phrases by signal ID.
Message analysis receives only `PRODUCTION_LEXICON_BY_LANGUAGE`, which includes
phrases marked `verified` with a non-empty named verifier and a named language
reviewer. Draft starters are kept separately in
`UNVERIFIED_LEXICON_BY_LANGUAGE` and are never visible to the matcher or scorer.

The matcher always retains the English rules and searches all verified language
lexicons by default. Supplying a selected language prioritizes that language's
phrase as evidence when the same signal matches in multiple languages; it does
not disable matching in other languages. English maps to the
`en-code-switched` lexicon while the existing English rules continue to apply
for every selected locale. Phrase entries match accent-stripped text; entries
marked `stem` may match within a word, while `phrase` entries require word
boundaries.

Each `starterPhrases` item has exact source text, a signal ID, a `form`
(`phrase` or `stem`), verification status, and verifier. Do not add glosses or
claim a phrase is authentic based on this seed file. Mark stems explicitly;
every phrase supplied by the playbook is currently marked `form: "phrase"` and
`status: "unverified"`, with an empty verifier. Production phrase arrays are
empty for every language.

The playbook's Section 7 starter examples are included for Shona (`sn`),
Ndebele (`nd`), Zulu (`zu`), Portuguese (`pt`), and Swahili (`sw`). Ndebele has
no supplied examples: a fluent Ndebele speaker must author them; do not copy
Zulu phrases into Ndebele. The `en-code-switched` area is intentionally empty.
Existing English Message Engine rules remain available for messages that mix
English with another language; no English phrase entries have been inferred or
added to this review-only lexicon.

ZD-24 requires at least eight verified phrases per language covering
`UPFRONT_FEE`, `CREDENTIAL_REQUEST`, `URGENCY`, `SECRECY`, `PRIZE_WIN`,
`MONEY_REVERSAL`, `RISKY_PAYMENT_METHOD`, and `OFF_PLATFORM`, plus three
natural scam and three honest example messages per language. Every language
is blocked pending a named fluent speaker/reviewer. Accordingly, each language
shows zero verified phrases, eight remaining to its minimum, all eight signal
IDs missing from verified coverage, and empty scam/honest message arrays.
No names, phrases, or example messages have been invented to fill these gaps.

ZD-15 integration is implemented, but it is **not acceptance-complete** for
multilingual production. Each language still needs at least five verified
phrases across at least four signal types, two positive speaker-reviewed
message tests and one negative speaker-reviewed test, and a 20,000-character
matching run below 50 ms. The current 20,000-character performance test checks
all selected locale modes against the empty lexicons; repeat the check when
reviewed phrases are added. At present, all five non-English production
lexicons are empty, every reviewer is unnamed, and no speaker-reviewed message
samples exist. Keep every language blocked until that evidence is supplied.
