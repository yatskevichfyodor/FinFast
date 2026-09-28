import { toRaw } from "vue";
import { openDatabase } from "./indexedDB";
import { CUSTOM_CATEGORIES_STORE_NAME } from "./indexedDB";
import type { Category } from "@/types/category";

interface CategoryRecord {
  userId: string;
  categoryId: string;
  category: Category;
}

export const customCategoryStorage = {
  async loadCategories(userId: string): Promise<Category[]> {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CUSTOM_CATEGORIES_STORE_NAME, "readonly");
      const range = IDBKeyRange.bound([userId, ""], [userId, "\uffff"]);
      const request = transaction
        .objectStore(CUSTOM_CATEGORIES_STORE_NAME)
        .getAll(range) as IDBRequest<CategoryRecord[]>;

      request.onsuccess = () => {
        resolve(request.result.map((record) => record.category));
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to load expenses"));
      };
    });
  },

  async saveCategories(userId: string, categories: Category[]): Promise<void> {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CUSTOM_CATEGORIES_STORE_NAME, "readwrite");
      const objectStore = transaction.objectStore(CUSTOM_CATEGORIES_STORE_NAME);
      const range = IDBKeyRange.bound([userId, ""], [userId, "\uffff"]);
      const existingRequest = objectStore.getAll(range) as IDBRequest<CategoryRecord[]>;

      existingRequest.onsuccess = () => {
        const categoriesIds = categories.map(it => it.id);

        existingRequest.result.forEach((record) => {
          if (!categoriesIds.includes(record.categoryId)) {
            objectStore.delete([userId, record.categoryId]);
          }
        });

        categories.forEach((category) => {
          objectStore.put({
            userId,
            categoryId: category.id,
            category: toRaw(category),
          } satisfies CategoryRecord);
        });
      };
      existingRequest.onerror = () => {
        transaction.abort();
      };

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Failed to save expenses"));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error("Failed to save expenses"));
      };
    });
  },
};
