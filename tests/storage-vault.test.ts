import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  EncryptedStorageVault,
  RECENT_RISK_MAX_AGE_MS,
  VAULT_DATABASE_NAME,
  VAULT_STORE_NAME,
  cleanRecentRisk,
  type VaultData,
} from "../src/storage/vault";

const PIN = "0427";
const now = Date.UTC(2025, 0, 1, 12);
const transaction = {
  id: "tx-1",
  recipientId: "recipient-1",
  amount: 450,
  currency: "ZAR",
  timestamp: now,
};
const initialData: VaultData = {
  history: [transaction],
  recentRisk: { band: "high", scamType: "job_scam", timestamp: now },
  settings: { language: "en" },
};

function readStoredPayload(factory: IDBFactory): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const openRequest = factory.open(VAULT_DATABASE_NAME);
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const request = database
        .transaction(VAULT_STORE_NAME, "readonly")
        .objectStore(VAULT_STORE_NAME)
        .get("primary");
      request.onsuccess = () => {
        resolve(request.result);
        database.close();
      };
      request.onerror = () => reject(request.error);
    };
  });
}

afterEach(async () => {
  const databases = await indexedDB.databases();
  await Promise.all(
    databases.map(
      ({ name }) =>
        new Promise<void>((resolve) => {
          if (name === undefined) return resolve();
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
});

describe("encrypted local data vault", () => {
  it("stores only encrypted payloads and restores them after reload", async () => {
    const factory = new IDBFactory();
    const vault = new EncryptedStorageVault({ indexedDB: factory, now: () => now });

    await expect(vault.setupPin(PIN, initialData)).resolves.toBe("persistent");
    const stored = await readStoredPayload(factory);
    expect(stored).toMatchObject({
      version: 1,
      salt: expect.any(String),
      iv: expect.any(String),
      ciphertext: expect.any(String),
    });
    expect(JSON.stringify(stored)).not.toContain("recipient-1");
    expect(JSON.stringify(stored)).not.toContain("job_scam");
    expect(JSON.stringify(stored)).not.toContain("0427");

    vault.lock();
    const reloaded = new EncryptedStorageVault({ indexedDB: factory, now: () => now });
    await expect(reloaded.unlock(PIN)).resolves.toEqual(initialData);
  }, 30_000);

  it("rejects a wrong PIN without falling back to session mode", async () => {
    const factory = new IDBFactory();
    const vault = new EncryptedStorageVault({ indexedDB: factory, now: () => now });
    await vault.setupPin(PIN, initialData);
    vault.lock();

    await expect(vault.unlock("9999")).rejects.toThrow("Wrong PIN");
    expect(vault.mode).toBe("locked");
  }, 30_000);

  it("keeps skipped-PIN data in memory and never opens IndexedDB", async () => {
    const vault = new EncryptedStorageVault({ indexedDB: undefined, now: () => now });
    vault.skipPin(initialData);

    await expect(vault.save(initialData)).resolves.toBe("session");
    expect(vault.getSessionData()).toEqual(initialData);
    expect(vault.mode).toBe("session");
  });

  it("falls back to session mode when IndexedDB is unavailable", async () => {
    const vault = new EncryptedStorageVault({ indexedDB: undefined, now: () => now });

    await expect(vault.setupPin(PIN, initialData)).resolves.toBe("session");
    expect(vault.getSessionData()).toEqual(initialData);
  }, 30_000);

  it("expires recent-risk records after 24 hours and rejects extra fields", () => {
    expect(
      cleanRecentRisk(
        { band: "high", timestamp: now - RECENT_RISK_MAX_AGE_MS - 1 },
        now,
      ),
    ).toBeUndefined();
    expect(
      cleanRecentRisk(
        { band: "high", timestamp: now, text: "must never be saved" },
        now,
      ),
    ).toBeUndefined();
    expect(cleanRecentRisk({ band: "low", timestamp: now }, now)).toBeUndefined();
  });

  it("deletes the database and requires a fresh PIN setup", async () => {
    const factory = new IDBFactory();
    const vault = new EncryptedStorageVault({ indexedDB: factory, now: () => now });
    await vault.setupPin(PIN, initialData);
    await vault.deleteAll();

    expect(vault.mode).toBe("locked");
    await expect(vault.unlock(PIN)).rejects.toThrow("No saved data");
  }, 30_000);

  it.each(["123", "1234567", "12ab", ""])("rejects invalid PIN %s", async (pin) => {
    const vault = new EncryptedStorageVault({ indexedDB: new IDBFactory() });
    await expect(vault.setupPin(pin, initialData)).rejects.toThrow(
      "PIN must contain 4 to 6 digits",
    );
  });
});