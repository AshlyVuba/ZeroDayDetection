import type { RiskBand, Transaction } from "../engine/types";
import {
  EncryptedStorageCrypto,
  type EncryptedPayload,
} from "./crypto";
import {
  IndexedDbEncryptedPersistence,
  type EncryptedPersistence,
  type StorageStoreName,
} from "./persistence";

export interface RecentRiskRecord {
  band: RiskBand;
  scamType?: string;
  timestamp: number;
}

export type StorageSettingValue = string | number | boolean | null;
export type StorageSettings = Readonly<
  Record<string, StorageSettingValue> & { language?: never }
>;

export type StorageSessionState =
  | "setup"
  | "locked"
  | "unlocked"
  | "memory-only";

export interface StorageSessionOptions {
  persistence?: EncryptedPersistence;
  crypto?: EncryptedStorageCrypto;
}

interface MemoryData {
  transactions: Transaction[];
  recentRisk: RecentRiskRecord | null;
  settings: StorageSettings | null;
}

const VAULT_KEY = "vault";
const VAULT_MARKER = "zeroday encrypted storage vault version 1";
const TRANSACTIONS_KEY = "history";
const RECENT_RISK_KEY = "latest";
const SETTINGS_KEY = "preferences";

const USER_DATA_KEYS: Array<[StorageStoreName, string]> = [
  ["transactions", TRANSACTIONS_KEY],
  ["recentRisk", RECENT_RISK_KEY],
  ["settings", SETTINGS_KEY],
];

export class StorageSession {
  readonly #persistence: EncryptedPersistence;
  readonly #crypto: EncryptedStorageCrypto;
  #mode: "inactive" | "persistent" | "memory" = "inactive";
  #memory: MemoryData | undefined;

  constructor(options: StorageSessionOptions = {}) {
    this.#persistence =
      options.persistence ?? new IndexedDbEncryptedPersistence();
    this.#crypto = options.crypto ?? new EncryptedStorageCrypto();
  }

  async getState(): Promise<StorageSessionState> {
    if (this.#mode === "memory") {
      return "memory-only";
    }
    if (this.#mode === "persistent" && this.#crypto.isUnlocked) {
      return "unlocked";
    }

    const vault = await this.#persistence.get("settings", VAULT_KEY);
    if (vault === undefined) {
      if (await this.#hasUserData()) {
        throw new Error("Encrypted storage is missing its vault key");
      }
      this.#mode = "inactive";
      return "setup";
    }

    this.#mode = "inactive";
    return "locked";
  }

  onStorageLocked(listener: () => void): () => void {
    return this.#crypto.onLock(() => {
      if (this.#mode === "persistent") {
        this.#mode = "inactive";
        listener();
      }
    });
  }

  async setupPin(pin: string): Promise<void> {
    this.#validatePin(pin);
    if ((await this.getState()) !== "setup") {
      throw new Error("PIN setup is only available before storage is initialized");
    }

    const vault = await this.#crypto.initialize(pin, VAULT_MARKER);
    try {
      await this.#persistence.put("settings", VAULT_KEY, vault);
    } catch (error) {
      this.#crypto.lock();
      throw error;
    }
    this.#mode = "persistent";
  }

  async unlock(pin: string): Promise<void> {
    const vault = await this.#persistence.get("settings", VAULT_KEY);
    if (vault === undefined) {
      throw new Error("PIN setup is required before storage can be unlocked");
    }

    const marker = await this.#crypto.unlock(pin, vault);
    if (marker !== VAULT_MARKER) {
      this.#crypto.lock();
      throw new Error("Encrypted storage vault metadata is invalid");
    }
    this.#mode = "persistent";
  }

  async skipPin(): Promise<void> {
    if ((await this.getState()) !== "setup") {
      throw new Error("Session-only storage is only available before PIN setup");
    }
    this.#memory = {
      transactions: [],
      recentRisk: null,
      settings: null,
    };
    this.#mode = "memory";
  }

  lock(): void {
    this.#crypto.lock();
    this.#memory = undefined;
    this.#mode = "inactive";
  }

  async getTransactions(): Promise<Transaction[]> {
    return this.#read("transactions", TRANSACTIONS_KEY, []);
  }

  async saveTransactions(transactions: readonly Transaction[]): Promise<void> {
    const copy = [...transactions];
    if (this.#mode === "memory") {
      this.#requireMemory().transactions = copy;
      return;
    }
    await this.#write("transactions", TRANSACTIONS_KEY, copy);
  }

  async getRecentRisk(): Promise<RecentRiskRecord | null> {
    return this.#read("recentRisk", RECENT_RISK_KEY, null);
  }

  async saveRecentRisk(record: RecentRiskRecord | null): Promise<void> {
    if (this.#mode === "memory") {
      this.#requireMemory().recentRisk = record;
      return;
    }
    await this.#writeNullable("recentRisk", RECENT_RISK_KEY, record);
  }

  async getSettings(): Promise<StorageSettings | null> {
    return this.#read("settings", SETTINGS_KEY, null);
  }

  async saveSettings(settings: StorageSettings | null): Promise<void> {
    if (this.#mode === "memory") {
      this.#requireMemory().settings = settings;
      return;
    }
    await this.#writeNullable("settings", SETTINGS_KEY, settings);
  }

  async clearAll(): Promise<void> {
    if (this.#mode === "memory") {
      this.#memory = undefined;
      this.#mode = "inactive";
      this.#crypto.lock();
      return;
    }
    await this.#persistence.clear();
    this.lock();
  }

  async close(): Promise<void> {
    this.lock();
    await this.#persistence.close();
  }

  async #read<T>(
    store: StorageStoreName,
    key: string,
    fallback: T,
  ): Promise<T> {
    if (this.#mode === "memory") {
      const memory = this.#requireMemory();
      if (store === "transactions") {
        return [...memory.transactions] as T;
      }
      if (store === "recentRisk") {
        return memory.recentRisk as T;
      }
      return memory.settings as T;
    }

    this.#requireUnlocked();
    const payload = await this.#persistence.get(store, key);
    if (payload === undefined) {
      return fallback;
    }
    return JSON.parse(await this.#crypto.decrypt(payload)) as T;
  }

  async #write<T>(
    store: StorageStoreName,
    key: string,
    value: T,
  ): Promise<void> {
    this.#requireUnlocked();
    const payload = await this.#crypto.encrypt(JSON.stringify(value));
    await this.#persistence.put(store, key, payload);
  }

  async #writeNullable<T>(
    store: StorageStoreName,
    key: string,
    value: T | null,
  ): Promise<void> {
    this.#requireUnlocked();
    if (value === null) {
      await this.#persistence.delete(store, key);
      return;
    }
    await this.#write(store, key, value);
  }

  async #hasUserData(): Promise<boolean> {
    const values = await Promise.all(
      USER_DATA_KEYS.map(([store, key]) => this.#persistence.get(store, key)),
    );
    return values.some((value) => value !== undefined);
  }

  #requireUnlocked(): void {
    if (this.#mode !== "persistent" || !this.#crypto.isUnlocked) {
      throw new Error("Storage is locked");
    }
  }

  #requireMemory(): MemoryData {
    if (this.#memory === undefined) {
      throw new Error("Session-only storage is not available");
    }
    return this.#memory;
  }

  #validatePin(pin: string): void {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error("PIN must contain 4 to 6 digits");
    }
  }
}

export function createStorageSession(
  options?: StorageSessionOptions,
): StorageSession {
  return new StorageSession(options);
}

export type { EncryptedPayload };
