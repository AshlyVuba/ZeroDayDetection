# ZeroDay Detection

ZeroDay Detection is a privacy-first scam checker. Message analysis is designed to
run on the user's device; message text must not be sent to a server.

## Run locally

```sh
npm install
npm run dev
npm test
```

Other checks are available with `npm run lint`, `npm run typecheck`, and
`npm run build`.

## Project map

- `src/engine/` — shared risk types and engine entry points
- `src/i18n/` — localized interface strings
- `src/ui/` — application screens
- `src/storage/` — local storage helpers
- `src/data/` — scam education content
- `tests/` — automated tests
- `docs/` — project decisions and dependency register

The engine functions currently return scaffold results; they do not detect scams.
Do not treat scaffold output as an assessment.
