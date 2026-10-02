# ZeroDay Detection

ZeroDay Detection is being built to help people pause before responding to a
suspicious message or making a potentially risky payment. The intended audience
includes people who want a clear, accessible way to check a message or payment
and understand what warning signs to look for.

The product goal is a private, rules-based check: explain possible warning
signs in plain language, give a risk indication, and suggest next steps. The
local Worker runs on-device; an optional HTTP API is also available. Neither
is intended to make decisions for users or guarantee that a message or
transaction is genuine.

The foundation uses Vite 8, React 19, TypeScript 7, and Vitest 5, with npm
scripts for local development and verification.

> **Important: this repository is an early foundation, not a complete scam
> checker.** Its rules and link checks are limited heuristics that can miss
> scams or flag honest messages. The Home screen is still a placeholder, and
> the API and encrypted storage are not connected to a user flow. Do not rely
> on its output to decide whether to send money or share information.

## Project status

### Implemented today

- A Vite application that renders a placeholder page titled **ZeroDay Detection**.
- Shared TypeScript types for risk results, signals, languages, and transactions.
- A standalone Web Worker analysis bridge with per-request workers, defensive
  message/result validation, a three-second timeout, cleanup, and a safe
  failure outcome. The bridge is not yet connected to the UI.
- Scored message matching, text-only link heuristics, transaction patterns,
  and a 60-minute cross-signal containing only risk band, type, and timestamp.
- Signal-grounded explanations and next steps. Explanations currently fall
  back to English for every selected language.
- An optional, stateless Node API for message and transaction analysis, with
  request validation, generic errors, and in-memory rate limiting.
- An encrypted IndexedDB vault with PIN setup/unlock, session-only fallback,
  24-hour recent-risk expiry, and delete-all support.
- Machine-assisted Shona, Northern Ndebele, isiZulu, Portuguese, and Swahili
  translation drafts. They are unreviewed Draft/Beta content, not final
  translations or production-ready.
- Vitest coverage for message rules, URL cases, normalization, evidence, and
  performance, plus the existing engine and scoring checks.
- A native-name language selector, browser-language default, local language
  preference, English fallback, and locale-aware number/currency formatting.
  Unreviewed or unknown locales remain visibly marked Beta.
- Focused engine, API, and storage tests, plus local development, test, lint,
  type-check, and production-build scripts.

### Planned, not implemented

- Broader detection coverage and independent review of the domain policy.
- Complete user-facing flows for entering and checking messages or payments.
- UI integration and demo testing for the Worker, API, and storage modules.
- Interface and educational content in English (`en`), Shona (`sn`), Northern
  Ndebele (`nd`), isiZulu (`zu`), Portuguese (`pt`), and Swahili (`sw`).
- Translation of the Home screen and remaining interface/educational copy in
  English (`en`), Shona (`sn`), Northern Ndebele (`nd`), isiZulu (`zu`),
  Portuguese (`pt`), and Swahili (`sw`). The selector is localized; Home copy
  remains English and is outside the current language-selector integration.
- Production deployment over HTTPS and a complete application UI.
- Human-reviewed explanations in each supported language.

The language selector persists only the selected language code; no message or
payment data is stored by localization. Remaining Home screen copy is currently
English. The message matcher is a limited rules engine, not a comprehensive
detector. The optional API is not deployed or called by the current UI, and no
complete user flow is available yet.

## Prerequisites

- Git
- Node.js 22 LTS and npm (npm is included with Node.js)

The repository's CI uses Node.js 22. Use a current Node.js 22 release for a
matching local environment.

## Get started

### Windows PowerShell

```powershell
git clone https://github.com/AshlyVuba/ZeroDayDetection.git
Set-Location ZeroDayDetection
npm ci
npm run dev
```

### macOS, Linux, or Git Bash

```sh
git clone https://github.com/AshlyVuba/ZeroDayDetection.git
cd ZeroDayDetection
npm ci
npm run dev
```

Vite prints the local URL in the terminal when the development server starts.
Keep that terminal running while using the app. Stop the server with `Ctrl+C`.

To check the project from a clean clone, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:api
```

The same commands work in PowerShell. `npm ci` installs the exact dependency
versions from `package-lock.json`; use it after cloning and whenever you need a
clean, reproducible dependency install.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite's local development server. |
| `npm run start:api` | Build and start the optional Node API on port `3000`. |
| `npm run build:api` | Build the Node API bundle into `dist-api/`. |
| `npm test` | Run the Vitest suite once. Message tests cover selected rule examples, not real-world detection accuracy. |
| `npm run lint` | Lint the application entry point and language-selector integration. |
| `npm run typecheck` | Type-check the engine and test TypeScript files without emitting output. |
| `npm run validate:i18n` | Check locale key/nested-shape parity and ensure review gates remain marked pending. |
| `npm run check:i18n:missing` | List missing core English catalog strings for each locale; exits unsuccessfully if any are missing. |
| `npm run build` | Build the static production bundle into `dist/`. |
| `npm run preview` | Serve the last production build locally; run `npm run build` first. |

## Project structure

```text
.
├── docs/
│   ├── api.md                 # HTTP API and privacy contract
│   └── tool-register.md       # Dependency register
├── .github/
│   └── workflows/ci.yml       # Automated checks for pushes and pull requests
├── src/
│   ├── data/                  # Reserved for scam education content
│   ├── engine/                # Message/link rules, scoring, transactions, worker contracts
│   ├── i18n/                  # Locale catalogs, formatting, fallback, and review status
│   ├── storage/               # Encrypted IndexedDB vault
│   ├── ui/                    # Home screen and language selector
│   └── main.jsx               # Current placeholder application
├── tests/
│   ├── engine.test.ts         # Shared engine contract tests
│   ├── worker-bridge.test.ts  # Worker request, failure, timeout, and cleanup tests
│   ├── api.test.ts            # HTTP validation, rate limits, and privacy tests
│   ├── storage-vault.test.ts  # Encrypted IndexedDB integration tests
│   └── message.test.ts        # Message rules and normalization tests
├── index.html                 # Browser document and application entry point
├── package.json               # Scripts and pinned dependencies
├── package-lock.json          # Reproducible npm dependency versions
├── tsconfig.json              # Strict TypeScript check settings
├── server/                    # Stateless Node HTTP API
├── vite.config.js             # Browser Vite configuration
└── vite.api.config.js         # Node API bundling configuration
```

The architecture keeps analysis in `src/engine/`, the optional HTTP adapter in
`server/`, and encrypted browser persistence in `src/storage/`. The API and
vault are implemented modules, but neither is connected to the placeholder
Home screen.

## Privacy principles

The local Worker analyzes text on-device and does not transmit it. The optional
HTTP API necessarily receives submitted message or payment data over the
network; it processes requests in memory, does not log request bodies, and
does not persist them. Deploy it only behind HTTPS. The browser vault encrypts
its IndexedDB payload, but it is not connected to the UI. This early-stage
project is not a comprehensive detector; do not enter sensitive information
or rely on its result to decide whether to pay or share information.

## Development and testing

1. Install dependencies with `npm ci`.
2. Start the app with `npm run dev` while making UI or application changes.
3. Add or update focused Vitest coverage alongside engine behavior in `tests/`.
   Message tests exercise selected phrases and normalization, not detection
   accuracy across real-world traffic.
4. Before submitting a change, run `npm run lint`, `npm run typecheck`,
   `npm test`, and `npm run build`.

The GitHub Actions workflow runs the same checks on pushes and pull requests
using Node.js 22.

## Limitations and next steps

ZeroDay Detection is not currently ready for real-world scam checking. Message
and transaction analysis are limited heuristics; URL lookalike detection is
not a reputation service, and the domain lists need independent review. The UI
remains a placeholder, explanations are English-only, and the API has not been
deployed or independently security-reviewed. The regional reports API is
intentionally not implemented because the playbook gates it as a stretch
feature. Treat every result as a prompt to verify independently, never as proof
that a message or payment is genuine.
