import { afterEach, describe, expect, it, vi } from "vitest";
import type { EncryptedPayload } from "../src/storage/crypto";
import {
  StorageSession,
  type RecentRiskRecord,
  type StorageSettings,
} from "../src/storage/session";
import type {
  EncryptedPersistence,
  StorageStoreName,
} from "../src/storage/persistence";
import type { Transaction } from "../src/engine/types";

class MemoryEncryptedPersistence implements EncryptedPersistence {
  readonly entries = new Map<string, EncryptedPayload>();
  readonly writes: Array<{
    store: StorageStoreName;
    key: string;
    value: EncryptedPayload;
  }> = [];

  async get(
    store: StorageStoreName,
    key: string,
  ): Promise<EncryptedPayload | undefined> {
    return this.entries.get(`${store}:${key}`);
  }

  async put(
    store: StorageStoreName,
    key: string,
    value: EncryptedPayload,
  ): Promise<void> {
    this.writes.push({ store, key, value });
    this.entries.set(`${store}:${key}`, value);
  }

  async delete(store: StorageStoreName, key: string): Promise<void> {
    this.entries.delete(`${store}:${key}`);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async close(): Promise<void> {}
}

const PIN = "0427";

afterEach(() => {
  vi.useRealTimers();
});

describe("encrypted storage session", () => {
  it("encrypts each stored value and restores it only after PIN unlock", async () => {
    const persistence = new MemoryEncryptedPersistence();
    const session = new StorageSession({ persistence });
    const transaction: Transaction = {
      id: "transaction-1",
      recipientId: "recipient-private",
      amount: 125,
      currency: "ZAR",
      timestamp: 1_735_000_000,
    };
    const recentRisk: RecentRiskRecord = {
      band: "high",
      scamType: "impersonation",
      timestamp: 1_735_000_001,
    };
    const settings: StorageSettings = {
      remindersEnabled: true,
      displayDensity: "comfortable",
    };

    await expect(session.getState()).resolves.toBe("setup");
    await expect(session.setupPin("12ab")).rejects.toThrow(
      "PIN must contain 4 to 6 digits",
    );
    await session.setupPin(PIN);
    await session.saveTransactions([transaction]);
    await session.saveRecentRisk(recentRisk);
    await session.saveSettings(settings);

    const serializedRecords = JSON.stringify([...persistence.entries]);
    expect(serializedRecords).not.toContain(PIN);
    expect(serializedRecords).not.toContain(transaction.id);
    expect(serializedRecords).not.toContain(transaction.recipientId);
    expect(serializedRecords).not.toContain(recentRisk.scamType);
    expect(persistence.writes).toHaveLength(4);
    for (const { value } of persistence.writes) {
      expect(value).toEqual(
        expect.objectContaining({
          version: 1,
          salt: expect.any(String),
          iv: expect.any(String),
          ciphertext: expect.any(String),
        }),
      );
      expect(JSON.stringify(value)).not.toContain(PIN);
    }

    session.lock();
    await expect(session.getState()).resolves.toBe("locked");
    await expect(session.getTransactions()).rejects.toThrow("Storage is locked");
    await expect(session.unlock(PIN)).resolves.toBeUndefined();
    await expect(session.getTransactions()).resolves.toEqual([transaction]);
    await expect(session.getRecentRisk()).resolves.toEqual(recentRisk);
    await expect(session.getSettings()).resolves.toEqual(settings);

    await session.saveRecentRisk(null);
    await expect(session.getRecentRisk()).resolves.toBeNull();
    await session.clearAll();
    await expect(session.getState()).resolves.toBe("setup");
    expect(persistence.entries.size).toBe(0);
    await session.close();
  }, 30_000);

  it("keeps skip-PIN data in memory and clears it when the session ends", async () => {
    const persistence = new MemoryEncryptedPersistence();
    const session = new StorageSession({ persistence });
    const transaction: Transaction = {
      id: "memory-only",
      recipientId: "recipient-memory-only",
      amount: 25,
      currency: "USD",
      timestamp: 1_735_000_000,
    };

    await session.skipPin();
    await session.saveTransactions([transaction]);
    await session.saveRecentRisk({
      band: "medium",
      timestamp: 1_735_000_001,
    });
    await session.saveSettings({ remindersEnabled: false });

    expect(persistence.writes).toHaveLength(0);
    expect(persistence.entries.size).toBe(0);
    await expect(session.getTransactions()).resolves.toEqual([transaction]);
    await expect(session.getState()).resolves.toBe("memory-only");

    session.lock();
    await expect(session.getState()).resolves.toBe("setup");
    await expect(session.getTransactions()).rejects.toThrow("Storage is locked");
    expect(persistence.entries.size).toBe(0);
    await session.close();
  });

  it("keeps saved records locked when explicitly starting a memory-only session", async () => {
    const persistence = new MemoryEncryptedPersistence();
    const session = new StorageSession({ persistence });
    const savedTransaction: Transaction = {
      id: "saved",
      recipientId: "private-recipient",
      amount: 75,
      currency: "ZAR",
      timestamp: 1_735_000_000,
    };

    await session.setupPin(PIN);
    await session.saveTransactions([savedTransaction]);
    const encryptedBeforeMemoryMode = JSON.stringify([...persistence.entries]);
    session.lock();
    await session.startMemoryOnly();

    await expect(session.getState()).resolves.toBe("memory-only");
    await expect(session.getTransactions()).resolves.toEqual([]);
    await session.saveTransactions([
      { ...savedTransaction, id: "temporary", recipientId: "memory-recipient" },
    ]);
    expect(JSON.stringify([...persistence.entries])).toBe(encryptedBeforeMemoryMode);
    await expect(session.getTransactions()).resolves.toEqual([
      { ...savedTransaction, id: "temporary", recipientId: "memory-recipient" },
    ]);

    session.lock();
    await expect(session.getState()).resolves.toBe("locked");
    await expect(session.unlock(PIN)).resolves.toBeUndefined();
    await expect(session.getTransactions()).resolves.toEqual([savedTransaction]);
    await session.close();
  }, 30_000);

  it("reports the crypto provider's idle lock without adding another timer", async () => {
    vi.useFakeTimers();
    const persistence = new MemoryEncryptedPersistence();
    const session = new StorageSession({ persistence });
    const locked = vi.fn();
    const unsubscribe = session.onStorageLocked(locked);

    await session.setupPin(PIN);
    expect(await session.getState()).toBe("unlocked");
    await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    await expect(session.getState()).resolves.toBe("locked");
    expect(locked).toHaveBeenCalledOnce();
    await expect(session.getSettings()).rejects.toThrow("Storage is locked");
    unsubscribe();
    await session.close();
  }, 30_000);
});
