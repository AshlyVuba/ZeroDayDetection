# Encrypted storage design

`EncryptedStorage` encrypts UTF-8 text with AES-256-GCM. Each encrypted payload
contains a fresh 16-byte salt and 12-byte IV; a key is derived from the PIN and
salt with PBKDF2-HMAC-SHA256 using 600,000 iterations. Random values come only
from WebCrypto's `crypto.getRandomValues`.

The derived, non-extractable key is kept only in the helper's memory and is
cleared after five minutes without successful activity, or immediately by
calling `lock()`. PIN-based decryption failures use the same `Wrong PIN` message
for incorrect PINs and altered data. Failed PIN attempts receive an increasing
delay, capped at one minute.

`CryptoProvider` is the algorithm-swap seam: it isolates random generation,
key derivation, encryption, and decryption from the storage helper. The shipped
`webCryptoProvider` uses only the browser WebCrypto API; an alternative
provider can be supplied without changing payload or lock management. This is
an interface boundary only, not a post-quantum implementation.
