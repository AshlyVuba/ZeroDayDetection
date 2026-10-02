import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EncryptedStorageCrypto,
  browserCryptoProvider,
  PBKDF2_ITERATIONS,
  STORAGE_IDLE_TIMEOUT_MS,
  WRONG_PIN_INITIAL_BACKOFF_MS,
  type EncryptedPayload,
} from "../src/storage/crypto";

const PIN = "0427";
const INITIAL_VALUE = "sensitive transaction data";

function flipCiphertextByte(payload: EncryptedPayload): EncryptedPayload {
  const bytes = Uint8Array.from(atob(payload.ciphertext), (character) =>
    character.charCodeAt(0),
  );
  bytes[bytes.length - 1] ^= 1;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return { ...payload, ciphertext: btoa(binary) };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("encrypted storage crypto", () => {
  it("round-trips values and uses a fresh IV for each encryption", async () => {
    const provider = {
      subtle: browserCryptoProvider.subtle,
      getRandomValues: vi.fn((array: Uint8Array<ArrayBuffer>) =>
        browserCryptoProvider.getRandomValues(array),
      ),
    };
    const storage = new EncryptedStorageCrypto(provider);
    const first = await storage.initialize(PIN, INITIAL_VALUE);

    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(atob(first.salt)).toHaveLength(16);
    expect(atob(first.iv)).toHaveLength(12);
    await expect(storage.decrypt(first)).resolves.toBe(INITIAL_VALUE);

    const second = await storage.encrypt(INITIAL_VALUE);
    const third = await storage.encrypt(INITIAL_VALUE);
    expect(second.iv).not.toBe(third.iv);
    expect(second.ciphertext).not.toBe(third.ciphertext);
    expect(provider.getRandomValues).toHaveBeenCalledTimes(4);
    await expect(storage.decrypt(second)).resolves.toBe(INITIAL_VALUE);
    storage.lock();
  }, 30_000);

  it("rejects tampered data with only the generic decrypt error", async () => {
    const storage = new EncryptedStorageCrypto();
    const payload = await storage.initialize(PIN, INITIAL_VALUE);
    const tampered = flipCiphertextByte(payload);

    await expect(storage.decrypt(tampered)).rejects.toThrow(/^Wrong PIN$/);
    storage.lock();
    await expect(storage.unlock(PIN, tampered)).rejects.toThrow(/^Wrong PIN$/);
  }, 30_000);

  it("uses progressive wrong-PIN backoff and auto-locks after five idle minutes", async () => {
    vi.useFakeTimers();
    const storage = new EncryptedStorageCrypto();
    const payload = await storage.initialize(PIN, INITIAL_VALUE);
    storage.lock();

    await expect(storage.unlock("wrong", payload)).rejects.toThrow(/^Wrong PIN$/);
    await expect(storage.unlock(PIN, payload)).rejects.toThrow(/^Wrong PIN$/);

    await vi.advanceTimersByTimeAsync(WRONG_PIN_INITIAL_BACKOFF_MS);
    await expect(storage.unlock("wrong", payload)).rejects.toThrow(/^Wrong PIN$/);
    await vi.advanceTimersByTimeAsync(WRONG_PIN_INITIAL_BACKOFF_MS * 2 - 1);
    await expect(storage.unlock(PIN, payload)).rejects.toThrow(/^Wrong PIN$/);
    await vi.advanceTimersByTimeAsync(1);
    await expect(storage.unlock(PIN, payload)).resolves.toBe(INITIAL_VALUE);

    await vi.advanceTimersByTimeAsync(STORAGE_IDLE_TIMEOUT_MS);
    await expect(storage.encrypt("locked")).rejects.toThrow("Storage is locked");
    storage.lock();
  }, 60_000);
});
