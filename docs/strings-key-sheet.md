# English strings key sheet

English source strings for ZeroDay Detection are in `src/i18n/en.json`. Keys use
flat dotted namespaces so they can be translated and referenced independently:

| Namespace | Contents |
| --- | --- |
| `band.*` | The low, medium, and high concern labels |
| `reason.*` | One short explanation for each message and transaction signal ID |
| `steps.*` | Three suggested next steps for each scam type |
| `ui.*` | Product name, input controls, result labels, and interface guidance |
| `errors.*` | Empty input, review, unavailable-result, and copy error messages |

## Signal reason keys

Each signal has exactly one corresponding `reason.<SIGNAL_ID>` entry.

**Message signals:** `CREDENTIAL_REQUEST`, `CREATE_ORDER_FOR_THEM`,
`UPFRONT_FEE`, `ROMANCE_MONEY`, `MONEY_REVERSAL`, `PRIZE_WIN`,
`LOOKALIKE_LINK`, `SECRECY`, `TOO_GOOD_PAY`, `IMPERSONATION`,
`RISKY_PAYMENT_METHOD`, `SHORTENED_LINK`, `URGENCY`, `OFF_PLATFORM`.

**Transaction signals:** `RECENT_RISKY_MESSAGE`, `AMOUNT_SPIKE`, `RAPID_REPEAT`,
`NEW_RECIPIENT`, `FIRST_LARGE`, `FEE_LIKE_AMOUNT`, `ODD_HOUR`.

Every signal reason is one sentence of no more than 15 words. Signal identifiers
are retained verbatim in the key suffix.

## Scam type next steps

Each scam type has three entries, `steps.<SCAM_TYPE>.1` through
`steps.<SCAM_TYPE>.3`:

- `job_scam`
- `phishing`
- `romance_scam`
- `mobile_money_reversal`
- `prize_scam`
- `impersonation`
- `mule_request`

## UI and error keys

`ui.*` contains `app_name`, `tagline`, `message_input_label`,
`message_input_placeholder`, `analyze_button`, `clear_button`, `result_heading`,
`risk_score`, `risk_band`, `reasons_heading`, `next_steps_heading`,
`language_label`, `privacy_note`, and `disclaimer`.

`errors.*` contains `empty_message`, `analysis_failed`, `result_unavailable`,
and `copy_failed`.

## Validation and review status

Run the dependency-free checker with `node scripts/check-strings.mjs`. It checks
that all required band, signal, scam-type, UI, and error keys are present and
non-empty, and that signal reasons meet the length and sentence-ending checks.

This key sheet and its English copy have not had a human comprehension review.
