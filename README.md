# ZeroDay Detection

ZeroDay Detection is being built to help people pause before responding to a
suspicious message or making a potentially risky payment. The intended audience
includes people who want a clear, accessible way to check a message or payment
and understand what warning signs to look for.

The product goal is a private, on-device, rules-based check: explain possible
warning signs in plain language, give a risk indication, and suggest safe next
steps. It is not intended to make decisions for users or guarantee that a
message or transaction is safe.

The foundation uses Vite 8, React 19, TypeScript 7, and Vitest 5, with npm
scripts for local development and verification.

> **Important: this repository is an early foundation, not a complete scam
> checker.** The message engine has limited English phrase rules and does not
> calculate a risk score; the interface is a placeholder and transaction
> analysis is still a scaffold. Do not use its output to assess a real message
> or payment.

## Project status

### Implemented today

- A Vite application that renders a placeholder page titled **ZeroDay Detection**.
- Shared TypeScript types for risk results, signals, languages, and transactions.
- English message matching for 12 phrase-based warning signals and local URL
  heuristics for lookalike and shortened links, with bounded original-text
  evidence; transaction analysis remains a scaffold.
- An explanation entry point that returns a fixed placeholder explanation and
  general next step.
- Three Vitest checks for those scaffold contracts.
- Machine-assisted Shona, Northern Ndebele, isiZulu, Portuguese, and Swahili
  translation drafts. They are unreviewed Draft/Beta content, not final
  translations or production-ready.
- Vitest coverage for message rules, URL cases, normalization, evidence, and
  performance, plus the existing engine and scoring checks.
- Local development, test, lint, type-check, and production-build scripts.

### Planned, not implemented

- Scored message analysis, transaction checks, broader detection coverage,
  evidence-based explanations, and practical next steps.
- Complete user-facing flows for entering and checking messages or payments.
- Interface and educational content in English (`en`), Shona (`sn`), Northern
  Ndebele (`nd`), isiZulu (`zu`), Portuguese (`pt`), and Swahili (`sw`).
- An installable offline-capable progressive web app (PWA).
- Local encrypted storage, with privacy-preserving handling of any user data.
- A complete application UI and production release.

The language codes currently exist as a shared type only; translated interface
content is not present. The message matcher is a limited English-only rules
engine, not a comprehensive detector. PWA and IndexedDB-related dependencies
are reserved for future work; offline support and encrypted storage are not
configured or implemented. There is no backend, deployed service, or completed
user flow yet.

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
```

The same commands work in PowerShell. `npm ci` installs the exact dependency
versions from `package-lock.json`; use it after cloning and whenever you need a
clean, reproducible dependency install.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite's local development server. |
| `npm test` | Run the Vitest suite once. Message tests cover selected rule examples, not real-world detection accuracy. |
| `npm run lint` | Lint the ESLint and Vite configuration files. |
| `npm run typecheck` | Type-check the engine and test TypeScript files without emitting output. |
| `npm run validate:i18n` | Check locale key/nested-shape parity and ensure review gates remain marked pending. |
| `npm run build` | Build the static production bundle into `dist/`. |
| `npm run preview` | Serve the last production build locally; run `npm run build` first. |

## Project structure

```text
.
├── docs/
│   └── tool-register.md       # Foundation dependency register
├── .github/
│   └── workflows/ci.yml       # Automated checks for pushes and pull requests
├── src/
│   ├── data/                  # Reserved for scam education content
│   ├── engine/                # Message rules, scoring, shared types, and analyzer stubs
│   ├── i18n/                  # Reserved for localized interface strings
│   ├── storage/               # Reserved for local storage helpers
│   ├── ui/                    # Reserved for application screens
│   └── main.jsx               # Current placeholder application
├── tests/
│   ├── engine.test.ts         # Shared engine contract tests
│   └── message.test.ts        # Message rules and normalization tests
├── index.html                 # Browser document and application entry point
├── package.json               # Scripts and pinned dependencies
├── package-lock.json          # Reproducible npm dependency versions
├── tsconfig.json              # Strict TypeScript check settings
└── vite.config.js             # Vite configuration
```

The intended architecture keeps message and transaction analysis in
`src/engine/`, separate from presentation, localization, and storage. The
directories marked as reserved are currently placeholders; this separation is
an architectural direction, not evidence those features are already working.

## Privacy principles

Privacy is a core product goal. The planned design is to perform checks on the
user's device with transparent, rules-based logic rather than sending message
content or payment details to a server. Any future local persistence should be
minimized, encrypted, and clearly explained to the user.

Those are design goals, not a claim about a completed privacy implementation:
the current app has no message/payment input flow, comprehensive analyzer,
backend, offline mode, or encrypted storage. Message matching runs locally and
does not log or transmit content. Do not enter real or sensitive information
expecting this early-stage project to protect or assess it.

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

ZeroDay Detection is not currently ready for real-world scam checking. The
English message matcher emits rule-based signals without computing risk scores;
link checks are limited heuristics, transaction analysis and explanations are
still scaffolds, and the application UI only displays a placeholder message.
Broader message and transaction coverage, user-facing explanations and flows,
localization,
privacy-focused local storage, offline PWA support, backend, and production
deployment remain future work. Treat the matcher as an early, limited heuristic
rather than a guarantee that a message is safe or fraudulent.
