export const PBKDF2_ITERATIONS = 600_000;
export const STORAGE_KEY_IDLE_TIMEOUT_MS = 5 * 60 * 1_000;

export interface EncryptedPayload {
  version: 1;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface CryptoProvider {
  randomBytes(length: number): Uint8Array;
  deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey>;
  encrypt(
    key: CryptoKey,
    plaintext: Uint8Array,
    iv: Uint8Array,
  ): Promise<Uint8Array>;
  decrypt(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
  ): Promise<Uint8Array>;
}

export const webCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  },

  async deriveKey(pin, salt) {
    const material = await globalThis.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return globalThis.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new Uint8Array(salt),
        iterations: PBKDF2_ITERATIONS,
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  },

  async encrypt(key, plaintext, iv) {
    return new Uint8Array(
      await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        new Uint8Array(plaintext),
      ),
    );
  },

  async decrypt(key, ciphertext, iv) {
    return new Uint8Array(
      await globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        new Uint8Array(ciphertext),
      ),
    );
  },
};

const WRONG_PIN = "Wrong PIN";
const MAX_RETRY_DELAY_MS = 60_000;

export class EncryptedStorage {
  private activeKey: CryptoKey | undefined;
  private activeSalt: Uint8Array | undefined;
  private lockTimer: ReturnType<typeof setTimeout> | undefined;
  private failedAttempts = 0;
  private retryAt = 0;
  private attemptQueue: Promise<void> = Promise.resolve();

  constructor(private readonly provider: CryptoProvider = webCryptoProvider) {}

  async encrypt(pin: string, plaintext: string): Promise<EncryptedPayload> {
    const salt = this.randomBytes(16);
    const iv = this.randomBytes(12);
    const key = await this.provider.deriveKey(pin, salt);
    const ciphertext = await this.provider.encrypt(
      key,
      new TextEncoder().encode(plaintext),
      iv,
    );

    this.activate(key, salt);
    return { version: 1, salt, iv, ciphertext };
  }

  async decrypt(
    payload: EncryptedPayload,
    pin?: string,
  ): Promise<string> {
    if (pin !== undefined) {
      return this.withPinAttempt(async () => {
        const key = await this.provider.deriveKey(pin, payload.salt);
        const plaintext = await this.provider.decrypt(
          key,
          payload.ciphertext,
          payload.iv,
        );
        const result = new TextDecoder("utf-8", { fatal: true }).decode(
          plaintext,
        );
        this.activate(key, payload.salt);
        return result;
      });
    }

    try {
      const activeKey = this.activeKey;
      const activeSalt = this.activeSalt;
      if (
        !activeKey ||
        !activeSalt ||
        !payload ||
        !sameBytes(activeSalt, payload.salt)
      ) {
        throw new Error(WRONG_PIN);
      }

      const plaintext = await this.provider.decrypt(
        activeKey,
        payload.ciphertext,
        payload.iv,
      );
      const result = new TextDecoder("utf-8", { fatal: true }).decode(
        plaintext,
      );
      this.touch();
      return result;
    } catch {
      throw new Error(WRONG_PIN);
    }
  }

  lock(): void {
    if (this.lockTimer !== undefined) {
      clearTimeout(this.lockTimer);
      this.lockTimer = undefined;
    }
    this.activeKey = undefined;
    this.activeSalt = undefined;
  }

  private async withPinAttempt<T>(operation: () => Promise<T>): Promise<T> {
    const attempt = this.attemptQueue.then(async () => {
      const delay = this.retryAt - Date.now();
      if (delay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }

      try {
        const result = await operation();
        this.failedAttempts = 0;
        this.retryAt = 0;
        return result;
      } catch {
        this.failedAttempts += 1;
        const delay = Math.min(
          1_000 * 2 ** (this.failedAttempts - 1),
          MAX_RETRY_DELAY_MS,
        );
        this.retryAt = Date.now() + delay;
        throw new Error(WRONG_PIN);
      }
    });

    this.attemptQueue = attempt.then(
      () => undefined,
      () => undefined,
    );
    return attempt;
  }

  private activate(key: CryptoKey, salt: Uint8Array): void {
    this.activeKey = key;
    this.activeSalt = new Uint8Array(salt);
    this.touch();
  }

  private touch(): void {
    if (this.lockTimer !== undefined) {
      clearTimeout(this.lockTimer);
    }
    this.lockTimer = setTimeout(() => this.lock(), STORAGE_KEY_IDLE_TIMEOUT_MS);
  }

  private randomBytes(length: number): Uint8Array {
    const bytes = this.provider.randomBytes(length);
    if (bytes.length !== length) {
      throw new Error("Crypto provider returned an invalid random byte length");
    }
    return bytes;
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((byte, i) => byte === right[i])
  );
}
