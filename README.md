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

> **Important: this repository is an early foundation, not a working scam
> checker.** The interface is a placeholder and the analyzer functions return
> fixed scaffold results. Do not use their output to assess a real message or
> payment.

## Project status

### Implemented today

- A Vite application that renders a placeholder page titled **ZeroDay Detection**.
- Shared TypeScript types for risk results, signals, languages, and transactions.
- Message and transaction analyzer entry points that return the same fixed,
  low-risk result for every input.
- An explanation entry point that returns a fixed placeholder explanation and
  general next step.
- Three Vitest checks for those scaffold contracts.
- Local development, test, lint, type-check, and production-build scripts.

### Planned, not implemented

- Useful rules-based checks for suspicious messages and payments, including
  evidence-based warnings, reasons, and practical next steps.
- Complete user-facing flows for entering and checking messages or payments.
- Interface and educational content in English (`en`), Shona (`sn`), Northern
  Ndebele (`nd`), isiZulu (`zu`), Portuguese (`pt`), and Swahili (`sw`).
- An installable offline-capable progressive web app (PWA).
- Local encrypted storage, with privacy-preserving handling of any user data.
- A complete application UI and production release.

The language codes currently exist as a shared type only; translated interface
content is not present. PWA and IndexedDB-related dependencies are reserved for
future work; offline support and encrypted storage are not configured or
implemented. There is no working detection engine, backend, deployed service, or
completed user flow yet.

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
| `npm test` | Run the Vitest suite once. Current tests cover scaffold behavior, not scam-detection accuracy. |
| `npm run lint` | Lint the ESLint and Vite configuration files. |
| `npm run typecheck` | Type-check the engine and test TypeScript files without emitting output. |
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
│   ├── engine/                # Shared types and analyzer/explanation stubs
│   ├── i18n/                  # Reserved for localized interface strings
│   ├── storage/               # Reserved for local storage helpers
│   ├── ui/                    # Reserved for application screens
│   └── main.jsx               # Current placeholder application
├── tests/
│   └── engine.test.ts         # Scaffold contract tests
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
the current app has no message/payment input flow, working analyzer, backend,
offline mode, or encrypted storage. Do not enter real or sensitive information
expecting this scaffold to protect or assess it.

## Development and testing

1. Install dependencies with `npm ci`.
2. Start the app with `npm run dev` while making UI or application changes.
3. Add or update focused Vitest coverage alongside engine behavior in `tests/`.
   The current tests only assert fixed scaffold outputs.
4. Before submitting a change, run `npm run lint`, `npm run typecheck`,
   `npm test`, and `npm run build`.

The GitHub Actions workflow runs the same checks on pushes and pull requests
using Node.js 22.

## Limitations and next steps

ZeroDay Detection is not currently ready for real-world scam checking. Analyzer
results are fixed values, the explanation has no evidence-based reasons, and
the application UI only displays a placeholder message. The project has no
completed detection rules, user flows, translations, offline PWA, encrypted
storage, backend, or production deployment.

The next product work is to build and test the rules-based analysis and its
explanations, then connect it to clear user flows. Localization, privacy-focused
local storage, and offline PWA support remain future work as well. Until those
features are implemented and validated, treat this repository as a development
foundation only.
