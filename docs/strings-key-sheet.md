# English strings key sheet

These strings are the English copy for **ZeroDay Detection**. Keep wording calm,
clear, and easy to read. Do not blame the person using the app or promise that
an assessment guarantees protection. Do not add contact details or web addresses
unless they have been checked and approved.

## Bands

| Key | English string |
| --- | --- |
| `band.low` | Few signs raised concern |
| `band.medium` | Some signs raised concern |
| `band.high` | Several signs raised concern |

## Signal reasons

Each signal has one short reason sentence. Keep each reason to 15 words or fewer.
Reasons describe the matched signal without repeating user-provided message text.

| Key | English string |
| --- | --- |
| `reason.CREDENTIAL_REQUEST` | The message appears to request a password, PIN, or one-time code. |
| `reason.CREATE_ORDER_FOR_THEM` | The request may involve using your account to place an order for someone else. |
| `reason.UPFRONT_FEE` | A fee may be requested before the promised payment, work, or item is provided. |
| `reason.ROMANCE_MONEY` | A personal or romantic contact appears to be asking for money or gifts. |
| `reason.MONEY_REVERSAL` | The sender says a payment was mistaken and asks you to return money. |
| `reason.PRIZE_WIN` | The message claims you won a prize or reward. |
| `reason.LOOKALIKE_LINK` | The link may imitate an official website; this check cannot verify the site. |
| `reason.SECRECY` | The sender appears to ask you to keep this request private. |
| `reason.TOO_GOOD_PAY` | The offer promises unusually high pay for little work. |
| `reason.IMPERSONATION` | The sender uses an unusual number or account while claiming to be someone you know. |
| `reason.RISKY_PAYMENT_METHOD` | The requested payment method may be difficult to reverse. |
| `reason.SHORTENED_LINK` | The shortened link hides the address of the website it opens. |
| `reason.URGENCY` | The message pressures you to act quickly. |
| `reason.OFF_PLATFORM` | The sender asks you to continue the conversation on another service. |
| `reason.RECENT_RISKY_MESSAGE` | A recent message check found warning signs related to this payment. |
| `reason.AMOUNT_SPIKE` | This payment is larger than recent payments in the same currency. |
| `reason.RAPID_REPEAT` | Several payments to this recipient happened within a short time. |
| `reason.NEW_RECIPIENT` | This is the first payment to this recipient in the available history. |
| `reason.FIRST_LARGE` | This is the first payment above the configured large-payment threshold. |
| `reason.FEE_LIKE_AMOUNT` | This amount matches a common fee-sized payment pattern. |
| `reason.ODD_HOUR` | This payment is scheduled during an unusual local hour. |

## Next steps by scam type

Each scam type has two to four simple actions. Show the matching set for the
result's scam type.

### `steps.job_scam`

- Pause before paying for a job or training.
- Check the company and role using a source you find yourself.
- Ask someone you trust to review the offer.

### `steps.phishing`

- Do not use the link in the message.
- Open the service using an app or address you already know.
- Change your password if you shared it.

### `steps.romance_scam`

- Do not send money or gift cards to someone you have not met.
- Take time to check their story with someone you trust.

### `steps.mobile_money_reversal`

- Check your balance in the payment app.
- Do not send money back based only on a message.
- Contact your payment provider through its app or a statement.

### `steps.prize_scam`

- Do not pay a fee to claim a prize.
- Check whether you entered the contest.
- Ask someone you trust before sharing details.

### `steps.impersonation`

- Contact the person using a number or app you already have.
- Do not send money or codes until you confirm.
- Ask someone you trust to review the request.

### `steps.mule_request`

- Do not place orders or move money for someone else.
- Do not share your account, payment, or identity details.
- If you already placed an order or moved money, contact the provider or your bank through a known channel.

## Interface labels

| Key | English string |
| --- | --- |
| `ui.appName` | ZeroDay Detection |
| `ui.messageTab` | Check a message |
| `ui.paymentTab` | Check a payment |
| `ui.messageLabel` | Message text |
| `ui.messagePlaceholder` | Paste a message here |
| `ui.paymentAmountLabel` | Payment amount |
| `ui.recipientLabel` | Recipient |
| `ui.checkButton` | Check now |
| `ui.checking` | Checking... |
| `ui.resultTitle` | What we noticed |
| `ui.reasonsTitle` | Why this was flagged |
| `ui.stepsTitle` | What you can do |
| `ui.dismissButton` | Close |
| `ui.privacyNote` | Your message stays on this device. |

## Errors

| Key | English string |
| --- | --- |
| `errors.loadFailed` | We could not load this information. Try again. |
| `errors.analysisFailed` | We could not check this message. Please try again. |
| `errors.emptyMessage` | Enter a message to check. |
| `errors.invalidAmount` | Enter a payment amount greater than zero. |
| `errors.offline` | You appear to be offline. Try again when connected. |
| `errors.saveFailed` | We could not save this setting. |
| `errors.unknown` | Something went wrong. Try again. |

## Review status

This is draft English copy and has not had a human comprehension review. The
Shona, Northern Ndebele, isiZulu, Portuguese, and Swahili catalogs are separate
machine-assisted Draft/Beta copies, also unreviewed and not production-ready.
See [the translation draft review tracker](translation-review.md) for locale
review status and release gates.
