# Tool Register

These are the dependencies approved for the initial project foundation, as
listed in the build playbook. Versions are pinned in `package.json`.

| Tool | What it is | Why it is used | Owner |
| --- | --- | --- | --- |
| React (`react`, `react-dom`) | UI library and browser renderer | Builds reusable application screens | Frontend Lead |
| Vite | Development server and build tool | Runs the app locally and produces static assets | Tech Lead |
| TypeScript | Typed JavaScript | Catches mistakes and defines the shared engine contract | Tech Lead |
| Vitest | Test runner | Runs the engine and application unit tests | Product & QA Lead |
| ESLint | JavaScript linter | Checks project configuration files | Tech Lead |
| Node.js built-in `http` | HTTP server module | Runs the optional stateless API without a web framework dependency | Tech Lead |
| Web Crypto API | Browser cryptography | Derives PIN keys and encrypts local data with AES-GCM | Tech Lead |
| IndexedDB | Browser database API | Stores only the encrypted local vault payload | Transaction Lead |
| fake-indexeddb | Test-only IndexedDB implementation | Tests vault persistence without browser data | Product & QA Lead |
| vite-plugin-pwa | Vite plugin for an installable offline app | Reserved for the PWA configuration issue | Tech Lead |
| idb | IndexedDB promise wrapper | Reserved for local-storage work | Transaction Lead |
