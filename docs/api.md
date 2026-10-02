# Analysis API

The API is an optional Node service. The browser can still use the local Web
Worker and does not need the API to analyze messages. The service keeps no
message or payment content after a request and does not log request bodies.
Requests are sent to the configured host, so use HTTPS when the service is
deployed. The rate limiter holds remote addresses in memory for up to one
minute; it does not persist them.

## Run locally

```sh
npm ci
npm run start:api
```

The API listens on port `3000` by default. Set `PORT` to use another port.
`npm run start:api` builds the production server bundle before starting it.

## Routes

### `GET /api/health`

Returns `200` with `{ "ok": true }`.

### `POST /api/message/analyse`

Send JSON with non-empty message text of at most 5,000 characters. The
optional `lang` must be one of `en`, `sn`, `nd`, `zu`, `pt`, or `sw`.

```json
{
  "text": "Please send your password so I can verify the account.",
  "lang": "en"
}
```

The `200` response contains `score`, `band`, `signals`, and an `explanation`
with a headline, signal-grounded reasons, and next steps. Explanations are
currently returned in English; unreviewed locale drafts are not presented as
verified translations. Evidence and URLs are plain text.

### `POST /api/transaction/analyse`

Send a transaction, its local history, and optionally a recent message risk
record. Supported currencies are `ZAR` and `USD`. The recent record contains
only `band`, `timestamp`, and optional `scamType`; extra fields such as message
text are rejected. Low, future, or older-than-24-hour records are discarded.
The cross-signal applies only to a non-phishing medium/high result no more than
60 minutes before the payment.

```json
{
  "transaction": {
    "id": "tx-current",
    "recipientId": "recipient-1",
    "amount": 450,
    "currency": "ZAR",
    "timestamp": 1735732800000
  },
  "history": [],
  "recentMessage": {
    "band": "high",
    "scamType": "job_scam",
    "timestamp": 1735731600000
  }
}
```

## Limits and errors

- JSON request bodies are limited to 20 KiB; larger requests receive `413`.
- Empty or overlong message text, invalid payment data, and malformed JSON
  receive a generic `400` response.
- Non-JSON request bodies receive `415`.
- Analysis routes are limited to 60 requests per remote address per minute;
  excess requests receive `429`. The in-memory limiter resets when the process
  restarts.
- Unknown paths, including traversal paths, receive `404`.
- Errors never echo request content. Analysis requests are not written to logs
  or persistent server storage.

There is no report or regional-statistics endpoint. The playbook marks that
feature as a stretch item gated on a separate checkpoint.

## URL checks

URL analysis inspects text only. It never fetches or resolves a URL. Official
and shortened domains are configured together in
`src/engine/link-config.ts`. Lookalike detection is a heuristic: it can miss
deceptive links and can flag unusual legitimate ones. A domain is not flagged
only because of its top-level domain.

## Local encrypted storage

`src/storage/vault.ts` stores payment history, settings, and the minimal recent
risk record as one AES-GCM encrypted payload in IndexedDB. PINs are never
stored. `skipPin()` and IndexedDB failures use session-only memory; callers can
read the current `mode` to explain that fallback. `deleteAll()` removes the
vault database. The vault is a backend module and is not yet connected to the
placeholder Home screen.