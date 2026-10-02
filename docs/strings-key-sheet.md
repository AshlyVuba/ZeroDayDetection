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

| Key | English string |
| --- | --- |
| `reason.CREDENTIAL_REQUEST` | This message asks for private sign-in details. |
| `reason.CREATE_ORDER_FOR_THEM` | Someone wants you to place an order on their behalf. |
| `reason.UPFRONT_FEE` | You are asked to pay before receiving what was promised. |
| `reason.ROMANCE_MONEY` | Someone you met online asks you for money. |
| `reason.MONEY_REVERSAL` | A sender asks you to return money after a payment. |
| `reason.PRIZE_WIN` | The message says you won something you did not enter. |
| `reason.LOOKALIKE_LINK` | This link looks like it may lead to a copied website. |
| `reason.SECRECY` | You are asked to keep this request from others. |
| `reason.TOO_GOOD_PAY` | The promised pay seems unusually high for the work. |
| `reason.IMPERSONATION` | The sender claims to be someone you may know. |
| `reason.RISKY_PAYMENT_METHOD` | The requested payment method may be hard to reverse. |
| `reason.SHORTENED_LINK` | This shortened link hides the website address. |
| `reason.URGENCY` | The message pressures you to act right away. |
| `reason.OFF_PLATFORM` | The sender asks you to continue outside this service. |
| `reason.RECENT_RISKY_MESSAGE` | A recent message raised concerns about this payment. |
| `reason.AMOUNT_SPIKE` | This payment is larger than your usual payments. |
| `reason.RAPID_REPEAT` | Several payments to this person happened close together. |
| `reason.NEW_RECIPIENT` | You have not paid this recipient before. |
| `reason.FIRST_LARGE` | This is your first payment of this size. |
| `reason.FEE_LIKE_AMOUNT` | The amount looks like a fee often used in scams. |
| `reason.ODD_HOUR` | This payment is happening at an unusual time for you. |

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

- Do not receive or move money for someone else.
- Do not share your account or payment details.
- If you already moved money, contact your bank through its app or a number on your card.

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
