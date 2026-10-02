import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EncryptedPayload } from "./crypto";

export type StorageStoreName = "transactions" | "recentRisk" | "settings";

export interface EncryptedPersistence {
  get(store: StorageStoreName, key: string): Promise<EncryptedPayload | undefined>;
  put(store: StorageStoreName, key: string, value: EncryptedPayload): Promise<void>;
  delete(store: StorageStoreName, key: string): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

interface StorageDatabase extends DBSchema {
  transactions: {
    key: string;
    value: EncryptedPayload;
  };
  recentRisk: {
    key: string;
    value: EncryptedPayload;
  };
  settings: {
    key: string;
    value: EncryptedPayload;
  };
}

const DATABASE_NAME = "zeroday-private-storage";
const DATABASE_VERSION = 1;

export class IndexedDbEncryptedPersistence implements EncryptedPersistence {
  #database: Promise<IDBPDatabase<StorageDatabase>> | undefined;

  async get(
    store: StorageStoreName,
    key: string,
  ): Promise<EncryptedPayload | undefined> {
    return (await this.#open()).get(store, key);
  }

  async put(
    store: StorageStoreName,
    key: string,
    value: EncryptedPayload,
  ): Promise<void> {
    await (await this.#open()).put(store, value, key);
  }

  async delete(store: StorageStoreName, key: string): Promise<void> {
    await (await this.#open()).delete(store, key);
  }

  async clear(): Promise<void> {
    const database = await this.#open();
    const transaction = database.transaction(
      ["transactions", "recentRisk", "settings"],
      "readwrite",
    );
    await Promise.all([
      transaction.objectStore("transactions").clear(),
      transaction.objectStore("recentRisk").clear(),
      transaction.objectStore("settings").clear(),
    ]);
    await transaction.done;
  }

  async close(): Promise<void> {
    if (this.#database !== undefined) {
      (await this.#database).close();
      this.#database = undefined;
    }
  }

  #open(): Promise<IDBPDatabase<StorageDatabase>> {
    this.#database ??= openDB<StorageDatabase>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          database.createObjectStore("transactions");
          database.createObjectStore("recentRisk");
          database.createObjectStore("settings");
        },
      },
    );
    return this.#database;
  }
}
