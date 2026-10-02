# ZeroDay Detection storage encryption

`src/storage/crypto.ts` encrypts storage values in the browser with AES-256-GCM.
It derives a non-extractable key from the user's PIN using PBKDF2-HMAC-SHA256
with 600,000 iterations. Each vault gets a random 16-byte salt, included in
every encrypted payload, and each value gets a fresh random 12-byte IV. The
versioned payload contains base64-encoded salt, IV, and authenticated ciphertext
so it can be persisted by a storage adapter without persisting the PIN or key.

The key stays in the crypto helper's memory, is erased on explicit lock or after
five minutes without successful use, and is never exportable. Unlock attempts
are progressively rate-limited after failures. Payload authentication and PIN
failures share the same `Wrong PIN` error so callers cannot distinguish them.
The `CryptoProvider` interface keeps Web Crypto replaceable for controlled tests
and future platform adaptation; the default implementation uses browser Web
Crypto's secure random generator. Slow-phone timing and an independent security
review remain follow-up work.

`src/storage/session.ts` provides a UI-independent `StorageSession` for encrypted
transaction history, a recent-risk summary, and non-sensitive settings. The
IndexedDB adapter stores only the crypto helper's versioned encrypted payloads;
keys are fixed store-level labels and contain no transaction or recipient
identifiers. PIN setup uses an encrypted vault marker, while Skip PIN selects a
separate in-memory mode that writes no records. `clearAll()` clears only this
application's IndexedDB stores and does not touch language preferences in
localStorage. The reusable PIN setup and lock screen is exported from
`src/storage/StorageAccess.jsx` but is intentionally not wired into Home.

Physical and browser storage inspection is still pending; automated tests verify
the encrypted persistence contract and session lifecycle, not on-device storage
contents.
