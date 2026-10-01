import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EncryptedStorage,
  STORAGE_KEY_IDLE_TIMEOUT_MS,
} from "../src/storage/crypto";

const pin = "482901";

describe("encrypted storage", () => {
  let storage: EncryptedStorage | undefined;

  afterEach(() => storage?.lock());

  it("round-trips text using the PIN", async () => {
    storage = new EncryptedStorage();
    const payload = await storage.encrypt(pin, "private message");

    expect(payload.salt).toHaveLength(16);
    expect(payload.iv).toHaveLength(12);
    expect(await storage.decrypt(payload, pin)).toBe("private message");
    expect(await storage.decrypt(payload)).toBe("private message");
  }, 30_000);

  it("reports a wrong PIN without exposing decryption details", async () => {
    storage = new EncryptedStorage();
    const payload = await storage.encrypt(pin, "private message");
    storage.lock();

    await expect(storage.decrypt(payload, "wrong-pin")).rejects.toMatchObject({
      message: "Wrong PIN",
    });
  }, 30_000);

  it("uses distinct salts, IVs, and ciphertexts for the same plaintext", async () => {
    storage = new EncryptedStorage();
    const first = await storage.encrypt(pin, "same message");
    const second = await storage.encrypt(pin, "same message");

    expect(first.salt).not.toEqual(second.salt);
    expect(first.iv).not.toEqual(second.iv);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
  }, 30_000);

  it("rejects tampered ciphertext with the same generic error", async () => {
    storage = new EncryptedStorage();
    const payload = await storage.encrypt(pin, "private message");
    const tampered = {
      ...payload,
      ciphertext: new Uint8Array(payload.ciphertext),
    };
    tampered.ciphertext[0] ^= 1;
    storage.lock();

    await expect(storage.decrypt(tampered, pin)).rejects.toMatchObject({
      message: "Wrong PIN",
    });
  }, 30_000);

  it("locks after five minutes without activity", async () => {
    vi.useFakeTimers();
    try {
      storage = new EncryptedStorage();
      const payload = await storage.encrypt(pin, "private message");
      await vi.advanceTimersByTimeAsync(STORAGE_KEY_IDLE_TIMEOUT_MS);

      await expect(storage.decrypt(payload)).rejects.toMatchObject({
        message: "Wrong PIN",
      });
    } finally {
      storage?.lock();
      vi.useRealTimers();
    }
  }, 30_000);
});
