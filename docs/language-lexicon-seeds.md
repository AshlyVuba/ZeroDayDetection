# Language lexicon seed data

`src/lexicon/seeds.json` is a draft-only, JSON-compatible input format for
language phrase review. It is not imported by message analysis or production
scoring. `src/lexicon/index.ts` provides TypeScript types and
`selectProductionPhrases`, which selects only items marked `verified` with a
non-empty named `verifier`.

Each `starterPhrases` item has exact source text, a signal ID, a `form`
(`phrase` or `stem`), verification status, and verifier. Do not add glosses or
claim a phrase is authentic based on this seed file. Mark stems explicitly;
every phrase supplied by the playbook is currently marked `form: "phrase"` and
`status: "unverified"`, with an empty verifier. Production phrase arrays are
empty for every language.

The playbook's Section 7 starter examples are included for Shona (`sn`),
Ndebele (`nd`), Zulu (`zu`), Portuguese (`pt`), and Swahili (`sw`). Ndebele has
no supplied examples: a fluent Ndebele speaker must author them; do not copy
Zulu phrases into Ndebele. The `en-code-switched` area is intentionally empty:
the current Message Engine has no reusable English matching strings or rules
from which to safely seed phrases.

ZD-24 requires at least eight verified phrases per language covering
`UPFRONT_FEE`, `CREDENTIAL_REQUEST`, `URGENCY`, `SECRECY`, `PRIZE_WIN`,
`MONEY_REVERSAL`, `RISKY_PAYMENT_METHOD`, and `OFF_PLATFORM`, plus three
natural scam and three honest example messages per language. Every language
is blocked pending a named fluent speaker/reviewer. Accordingly, each language
shows zero verified phrases, eight remaining to its minimum, all eight signal
IDs missing from verified coverage, and empty scam/honest message arrays.
No names, phrases, or example messages have been invented to fill these gaps.
