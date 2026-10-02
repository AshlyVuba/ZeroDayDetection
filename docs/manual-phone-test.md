# Manual phone test

**Status: TODO — flows are implemented; physical-device checks have not been
performed.** Automated checks are not a substitute for real-phone, screen
reader, offline, or network-inspection testing. Do not record these cases as
passed until manually completed.

## Before testing

- Use a test build and invented fixture data only. Do not paste real messages,
  names, phone numbers, account details, or other personal information.
- Confirm the app explains that analysis stays on-device. Inspect network
  activity during message entry and local Worker analysis; no message text
  should leave the phone. Separately verify that the optional API request is
  sent only after activating its clearly labelled button, and that cancelling
  or ignoring it leaves the local result intact.
- Verify first-run PIN setup, PIN unlock after reload, lock and idle-lock
  behavior, and the explicitly chosen memory-only option. Confirm memory-only
  history/risk metadata clears at session end and does not overwrite encrypted
  saved records.
- For payments, verify fields are editable, saved history reloads only after
  unlocking, and a recent risky message links only its band/type/time (never
  its text). If testing the optional payment API, confirm its disclosure names
  the recipient, payment details, history, and minimal risk metadata.
- When available, enable airplane mode and confirm the app can still open and
  analyse the fixture cases offline. Note any platform feature that requires a
  connection rather than treating it as a failed offline analysis.
- Test at a 360 CSS-pixel viewport width and on at least one physical phone.
- Test all controls using the on-screen keyboard and a screen reader. Check
  focus order, labels, result announcements, text scaling, and that the
  keyboard does not hide the active control or result.

## Cases and expected results

Enter the message text exactly as stored in `tests/fixtures/cases.json`; use
the transaction scenario fields for cases 11–12. Check the displayed band and
signal explanations against `expectedBands` and `expectedSignals`. Cases 3 and
5 intentionally accept either Medium or High.

| Case | Expected band(s) | Expected signals | Manual status |
| --- | --- | --- | --- |
| 1 | High | UPFRONT_FEE, SECRECY, RISKY_PAYMENT_METHOD | TODO |
| 2 | High | CREDENTIAL_REQUEST, URGENCY, SHORTENED_LINK | TODO |
| 3 | Medium or High | MONEY_REVERSAL | TODO |
| 4 | High | ROMANCE_MONEY, RISKY_PAYMENT_METHOD | TODO |
| 5 | Medium or High | TOO_GOOD_PAY, OFF_PLATFORM | TODO |
| 6 | High | PRIZE_WIN, UPFRONT_FEE | TODO |
| 7 | Low; honest request must not be flagged | None | TODO |
| 8 | Low | None | TODO |
| 9 | Low | None | TODO |
| 10 | Low | None | TODO |
| 11 | High; new-recipient payment at 02:30, 20 minutes after case 1 | NEW_RECIPIENT, ODD_HOUR, RECENT_RISKY_MESSAGE | TODO |
| 12 | Low; known recipient, usual amount, midday | None | TODO |

## Record results

For each device, record the app/build version, phone model, OS version, viewport
width, screen reader and keyboard used, online/offline state, case ID, actual
band/signals, pass/fail/not-testable, and a brief note. Attach screenshots only
from invented test data; check them for personal information before sharing.
