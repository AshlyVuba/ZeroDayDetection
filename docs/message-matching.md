# English message matching

The message engine normalizes input with Unicode NFKC, removes zero-width
characters, lowercases it, and collapses whitespace. Rules match an
accent-stripped representation; evidence is sliced from the original message
and limited to 40 characters.

`matchMessageSignals` returns matching non-link `Signal` objects only. The
existing `analyseMessage` entry point retains its `RiskResult` shape with the
signals attached and placeholder score/band values; it does not score messages.
Rule weights come from `MESSAGE_SCORING_CONFIG.signalWeights`. Link signals
remain reserved for ZD-13.

The Vitest performance check warms the matcher twice, then takes seven
measurements of a 20,000-character message and asserts that the median is under
50 ms. The input has a matching phrase at the end so each rule scans the full
message. The matcher uses bounded-distance, non-global regular expressions and
does not log or transmit message content.

The phrase rules are intentionally small and English-only. They can miss
unusual wording and can match benign messages that quote scam language; validate
the rules against representative user messages before relying on them in a
real-world decision.
