# Message matching

The message engine normalizes input with Unicode NFKC, removes zero-width
characters, lowercases it, and collapses whitespace. Rules match an
accent-stripped representation; evidence is sliced from the original message
and limited to 40 characters.

`matchMessageSignals` returns matching non-link `Signal` objects only. It
applies the existing English rules for every selected language and checks all
verified language lexicons by default. Passing a language prioritizes that
language's evidence for duplicate signal matches but does not restrict other
languages. Only named-speaker-reviewed production phrases are loaded;
unverified starters remain review-only. `analyseMessage` retains its
`RiskResult` shape with signals attached and placeholder score/band values; it
does not score messages. Rule weights come from
`MESSAGE_SCORING_CONFIG.signalWeights`. Link signals remain reserved for ZD-13.

The Vitest performance check warms the matcher twice, then takes seven
measurements of a 20,000-character message and asserts that the median is under
50 ms. The input has a matching phrase at the end so each rule scans the full
message. The matcher uses bounded-distance, non-global regular expressions and
does not log or transmit message content.

The English phrase rules are intentionally small and can miss unusual wording
or match benign messages that quote scam language. Multilingual coverage is
currently blocked: no non-English phrases or example messages have named
speaker review. Do not treat the integrated lexicon as production-ready until
each language meets its phrase coverage, speaker-reviewed positive/negative
sample, and performance acceptance gates documented in
`language-lexicon-seeds.md`.
