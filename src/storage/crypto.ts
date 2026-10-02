export const PBKDF2_ITERATIONS = 600_000;
export const STORAGE_IDLE_TIMEOUT_MS = 5 * 60 * 1_000;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const MAX_BACKOFF_MS = 30_000;
export const WRONG_PIN_INITIAL_BACKOFF_MS = 500;

type CryptoBytes = Uint8Array<ArrayBuffer>;

export interface CryptoProvider {
  readonly subtle: SubtleCrypto;
  getRandomValues(array: CryptoBytes): CryptoBytes;
}

export interface EncryptedPayload {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export const browserCryptoProvider: CryptoProvider = {
  subtle: globalThis.crypto.subtle,
  getRandomValues: (array) => globalThis.crypto.getRandomValues(array),
};

export class EncryptedStorageCrypto {
  #activeKey: CryptoKey | undefined;
  #salt: CryptoBytes | undefined;
  #lastActivity = 0;
  #lockTimer: ReturnType<typeof setTimeout> | undefined;
  #failedAttempts = 0;
  #blockedUntil = 0;

  constructor(private readonly provider: CryptoProvider = browserCryptoProvider) {}

  async initialize(pin: string, initialValue: string): Promise<EncryptedPayload> {
    this.lock();

    const salt = this.provider.getRandomValues(new Uint8Array(new ArrayBuffer(SALT_LENGTH)));
    const key = await this.deriveKey(pin, salt);
    const payload = await this.encryptWithKey(key, salt, initialValue);

    this.#activate(key, salt);
    this.#resetBackoff();
    return payload;
  }

  async unlock(pin: string, payload: EncryptedPayload): Promise<string> {
    this.lock();

    if (Date.now() < this.#blockedUntil) {
      throw new Error("Wrong PIN");
    }

    try {
      const { salt, iv, ciphertext } = this.#decodePayload(payload);
      const key = await this.deriveKey(pin, salt);
      const plaintext = await this.provider.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );

      this.#activate(key, salt);
      this.#resetBackoff();
      return new TextDecoder().decode(plaintext);
    } catch {
      this.#failedAttempts += 1;
      const delay = Math.min(
        WRONG_PIN_INITIAL_BACKOFF_MS * 2 ** (this.#failedAttempts - 1),
        MAX_BACKOFF_MS,
      );
      this.#blockedUntil = Date.now() + delay;
      this.lock();
      throw new Error("Wrong PIN");
    }
  }

  async encrypt(value: string): Promise<EncryptedPayload> {
    const { key, salt } = this.#requireActiveKey();
    const payload = await this.encryptWithKey(key, salt, value);
    this.#touch();
    return payload;
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    try {
      const { key, salt: activeSalt } = this.#requireActiveKey();
      const { salt, iv, ciphertext } = this.#decodePayload(payload);

      if (!this.#sameBytes(salt, activeSalt)) {
        throw new Error("Payload salt does not match the unlocked key");
      }

      const plaintext = await this.provider.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );
      this.#touch();
      return new TextDecoder().decode(plaintext);
    } catch {
      throw new Error("Wrong PIN");
    }
  }

  lock(): void {
    if (this.#lockTimer !== undefined) {
      clearTimeout(this.#lockTimer);
      this.#lockTimer = undefined;
    }
    this.#activeKey = undefined;
    this.#salt = undefined;
    this.#lastActivity = 0;
  }

  private async deriveKey(pin: string, salt: CryptoBytes): Promise<CryptoKey> {
    const material = await this.provider.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return this.provider.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  private async encryptWithKey(
    key: CryptoKey,
    salt: CryptoBytes,
    value: string,
  ): Promise<EncryptedPayload> {
    const iv = this.provider.getRandomValues(new Uint8Array(new ArrayBuffer(IV_LENGTH)));
    const ciphertext = await this.provider.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    );

    return {
      version: 1,
      salt: this.#encodeBase64(salt),
      iv: this.#encodeBase64(iv),
      ciphertext: this.#encodeBase64(new Uint8Array(ciphertext)),
    };
  }

  #decodePayload(payload: EncryptedPayload): {
    salt: CryptoBytes;
    iv: CryptoBytes;
    ciphertext: CryptoBytes;
  } {
    if (payload.version !== 1) {
      throw new Error("Unsupported encrypted payload");
    }

    const salt = this.#decodeBase64(payload.salt);
    const iv = this.#decodeBase64(payload.iv);
    const ciphertext = this.#decodeBase64(payload.ciphertext);

    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || ciphertext.length < 16) {
      throw new Error("Invalid encrypted payload");
    }

    return { salt, iv, ciphertext };
  }

  #requireActiveKey(): { key: CryptoKey; salt: CryptoBytes } {
    if (
      this.#activeKey === undefined ||
      this.#salt === undefined ||
      Date.now() - this.#lastActivity >= STORAGE_IDLE_TIMEOUT_MS
    ) {
      this.lock();
      throw new Error("Storage is locked");
    }

    return { key: this.#activeKey, salt: this.#salt };
  }

  #activate(key: CryptoKey, salt: CryptoBytes): void {
    this.#activeKey = key;
    this.#salt = salt;
    this.#touch();
  }

  #touch(): void {
    this.#lastActivity = Date.now();
    if (this.#lockTimer !== undefined) {
      clearTimeout(this.#lockTimer);
    }
    this.#lockTimer = setTimeout(() => this.lock(), STORAGE_IDLE_TIMEOUT_MS);
  }

  #resetBackoff(): void {
    this.#failedAttempts = 0;
    this.#blockedUntil = 0;
  }

  #encodeBase64(bytes: CryptoBytes): string {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  #decodeBase64(value: string): CryptoBytes {
    const binary = atob(value);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  #sameBytes(left: CryptoBytes, right: CryptoBytes): boolean {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((byte, index) => byte === right[index]);
  }
}
