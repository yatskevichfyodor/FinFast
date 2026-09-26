import { once } from "lodash-es";
import { migrateToV5 } from "./migrations/v5";

const DATABASE_NAME = "finfast";
const DATABASE_VERSION = 6;

export const EXPENSES_STORE_NAME = "expenses";
export const CUSTOM_CATEGORIES_STORE_NAME = "custom_categories";

export const openDatabase = once(async function (): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = request.transaction;
      const oldVersion = event.oldVersion;

      if (!database.objectStoreNames.contains(EXPENSES_STORE_NAME)) {
        database.createObjectStore(EXPENSES_STORE_NAME, {
          keyPath: ["userId", "expenseId"],
        });
      }

      if (!database.objectStoreNames.contains(CUSTOM_CATEGORIES_STORE_NAME)) {
        database.createObjectStore(CUSTOM_CATEGORIES_STORE_NAME, {
          keyPath: ["userId", "categoryId"],
        });
      }

      if (oldVersion < 5 && transaction) {
        migrateToV5(transaction);
      }

      // add future migrations here like this:
      // if (oldVersion < 5) {
      //     migrateToV5(transaction)
      // }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open expenses database"));
  });
});
