import { EncryptedStorageCrypto } from "./crypto";
import type { EncryptedPayload } from "./crypto";
import { cleanRecentRisk } from "../engine/recent-risk";
import type { RecentRiskRecord, Transaction } from "../engine/types";

export { cleanRecentRisk, RECENT_RISK_MAX_AGE_MS } from "../engine/recent-risk";

export const VAULT_DATABASE_NAME = "zeroday-private-data";
export const VAULT_STORE_NAME = "encrypted-records";
export const MAX_SAVED_TRANSACTIONS = 500;

export interface VaultData {
  history: Transaction[];
  recentRisk?: RecentRiskRecord;
  settings: Record<string, string | number | boolean>;
}

export type VaultMode = "locked" | "session" | "persistent";

export interface VaultOptions {
  crypto?: EncryptedStorageCrypto;
  indexedDB?: IDBFactory;
  now?: () => number;
}

export const EMPTY_VAULT_DATA: VaultData = {
  history: [],
  settings: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.recipientId === "string" &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount >= 0 &&
    typeof value.currency === "string" &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp)
  );
}

function cleanVaultData(value: unknown, now: number): VaultData {
  if (!isRecord(value) || !Array.isArray(value.history) || !isRecord(value.settings)) {
    throw new TypeError("Invalid local data");
  }
  if (!value.history.every(isTransaction)) {
    throw new TypeError("Invalid payment history");
  }
  const settings: VaultData["settings"] = {};
  for (const [key, setting] of Object.entries(value.settings)) {
    if (
      typeof setting !== "string" &&
      typeof setting !== "number" &&
      typeof setting !== "boolean"
    ) {
      throw new TypeError("Invalid local settings");
    }
    if (typeof setting === "number" && !Number.isFinite(setting)) {
      throw new TypeError("Invalid local settings");
    }
    settings[key] = setting;
  }

  const recentRisk = cleanRecentRisk(value.recentRisk, now);
  return {
    history: value.history.slice(-MAX_SAVED_TRANSACTIONS),
    ...(recentRisk === undefined ? {} : { recentRisk }),
    settings,
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Storage failed"));
  });
}

export class EncryptedStorageVault {
  #crypto: EncryptedStorageCrypto;
  #factory: IDBFactory | undefined;
  #now: () => number;
  #database: IDBDatabase | undefined;
  #mode: VaultMode = "locked";
  #sessionData: VaultData = { history: [], settings: {} };

  constructor(options: VaultOptions = {}) {
    this.#crypto = options.crypto ?? new EncryptedStorageCrypto();
    this.#factory = Object.hasOwn(options, "indexedDB")
      ? options.indexedDB
      : globalThis.indexedDB;
    this.#now = options.now ?? Date.now;
  }

  get mode(): VaultMode {
    return this.#mode;
  }

  async setupPin(pin: string, initialData: VaultData = EMPTY_VAULT_DATA): Promise<VaultMode> {
    this.#validatePin(pin);
    const cleanData = cleanVaultData(initialData, this.#now());
    this.#sessionData = cleanData;

    try {
      const payload = await this.#crypto.initialize(pin, JSON.stringify(cleanData));
      await this.#writePayload(payload);
      this.#mode = "persistent";
    } catch {
      this.#crypto.lock();
      this.#mode = "session";
    }
    return this.#mode;
  }

  skipPin(initialData: VaultData = EMPTY_VAULT_DATA): void {
    this.#crypto.lock();
    this.#sessionData = cleanVaultData(initialData, this.#now());
    this.#mode = "session";
  }

  async unlock(pin: string): Promise<VaultData> {
    this.#validatePin(pin);
    this.#mode = "locked";
    this.#sessionData = { history: [], settings: {} };
    let payload: EncryptedPayload | undefined;
    try {
      payload = await this.#readPayload();
    } catch {
      this.#crypto.lock();
      this.#sessionData = { history: [], settings: {} };
      this.#mode = "session";
      return this.#copy(this.#sessionData);
    }
    if (payload === undefined) throw new Error("No saved data");

    const plaintext = await this.#crypto.unlock(pin, payload);
    try {
      const parsed: unknown = JSON.parse(plaintext);
      this.#sessionData = cleanVaultData(parsed, this.#now());
    } catch {
      this.#crypto.lock();
      throw new Error("Saved data is invalid");
    }
    this.#mode = "persistent";
    return this.#copy(this.#sessionData);
  }

  async save(data: VaultData): Promise<VaultMode> {
    if (this.#mode === "locked") throw new Error("Storage is locked");
    const cleanData = cleanVaultData(data, this.#now());
    this.#sessionData = cleanData;
    if (this.#mode === "session") return this.#mode;

    try {
      const payload = await this.#crypto.encrypt(JSON.stringify(cleanData));
      await this.#writePayload(payload);
    } catch {
      this.#crypto.lock();
      this.#mode = "session";
    }
    return this.#mode;
  }

  getSessionData(): VaultData {
    if (this.#mode !== "session") throw new Error("Session storage is not active");
    return this.#copy(this.#sessionData);
  }

  lock(): void {
    this.#crypto.lock();
    this.#mode = "locked";
    this.#sessionData = { history: [], settings: {} };
  }

  async deleteAll(): Promise<void> {
    this.lock();
    this.#sessionData = { history: [], settings: {} };
    this.#database?.close();
    this.#database = undefined;
    if (this.#factory === undefined) return;
    await new Promise<void>((resolve, reject) => {
      const request = this.#factory?.deleteDatabase(VAULT_DATABASE_NAME);
      if (request === undefined) {
        reject(new Error("Storage is unavailable"));
        return;
      }
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Delete failed"));
      request.onblocked = () => reject(new Error("Storage is open in another tab"));
    });
  }

  #validatePin(pin: string): void {
    if (!/^\d{4,6}$/u.test(pin)) {
      throw new RangeError("PIN must contain 4 to 6 digits");
    }
  }

  async #openDatabase(): Promise<IDBDatabase> {
    if (this.#database !== undefined) return this.#database;
    if (this.#factory === undefined) throw new Error("Storage is unavailable");
    const request = this.#factory.open(VAULT_DATABASE_NAME, 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const opened = request.result;
        if (!opened.objectStoreNames.contains(VAULT_STORE_NAME)) {
          opened.createObjectStore(VAULT_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Storage failed"));
      request.onblocked = () => reject(new Error("Storage is open in another tab"));
    });
    this.#database = database;
    return database;
  }

  async #readPayload(): Promise<EncryptedPayload | undefined> {
    const database = await this.#openDatabase();
    const transaction = database.transaction(VAULT_STORE_NAME, "readonly");
    const result = await requestResult(
      transaction.objectStore(VAULT_STORE_NAME).get("primary"),
    );
    if (result === undefined) return undefined;
    if (
      !isRecord(result) ||
      result.version !== 1 ||
      typeof result.salt !== "string" ||
      typeof result.iv !== "string" ||
      typeof result.ciphertext !== "string"
    ) {
      throw new Error("Invalid encrypted data");
    }
    return result as unknown as EncryptedPayload;
  }

  async #writePayload(payload: EncryptedPayload): Promise<void> {
    const database = await this.#openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(VAULT_STORE_NAME, "readwrite");
      transaction.objectStore(VAULT_STORE_NAME).put(payload, "primary");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Storage failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Storage failed"));
    });
  }

  #copy(data: VaultData): VaultData {
    return JSON.parse(JSON.stringify(data)) as VaultData;
  }
}