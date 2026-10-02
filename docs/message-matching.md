# English message matching

The message engine normalizes input with Unicode NFKC, removes zero-width
characters, lowercases it, and collapses whitespace. Rules match an
accent-stripped representation; evidence is sliced from the original message
and limited to 40 characters.

`matchMessageSignals` returns matching message and link `Signal` objects. Link
matching extracts HTTP(S) URLs and bare domains (including `www.` domains),
trims terminal punctuation, and keeps evidence as bounded plain text. It does
not fetch, resolve, probe, or navigate to URLs. Shortener hosts produce
`SHORTENED_LINK`; non-allowlisted domains containing a listed brand term,
punycode hosts, raw IPv4 hosts, and non-HTTPS links alongside credential terms
can produce `LOOKALIKE_LINK`. A TLD alone is not a signal. Signal weights come
from `MESSAGE_SCORING_CONFIG.signalWeights`. The existing `analyseMessage`
entry point retains its `RiskResult` shape with the signals attached and
placeholder score/band values; it does not score messages.

The allowlist in `LINK_ANALYSIS_CONFIG` is a starter heuristic, not a verified
ownership list. Its current examples are `mukuru.com`, `capitec.co.za`, and
`fnb.co.za`; a second person must verify the domains before relying on or
expanding the list. Allowlisted domains and their subdomains are excluded from
lookalike signals.

The Vitest performance check warms the matcher twice, then takes seven
measurements of a 20,000-character message and asserts that the median is under
50 ms. The input has a matching phrase at the end so each rule scans the full
message. The matcher uses bounded-distance, non-global regular expressions and
does not log or transmit message content.

The phrase rules are intentionally small and English-only. They can miss
unusual wording and can match benign messages that quote scam language; validate
the rules against representative user messages before relying on them in a
real-world decision.
