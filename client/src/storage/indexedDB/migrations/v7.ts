import type { CustomCategory } from "@/types/category";
import { CUSTOM_CATEGORIES_STORE_NAME } from "../indexedDB";

export interface OldCategoryType {
  id: string;
  name: string;
  icon: string;
  color: string;
  system: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

interface CategoryRecord {
  userId: string;
  categoryId: string;
  category: OldCategoryType;
}

export function migrateToV7(transaction: IDBTransaction) {
  const objectStore = transaction.objectStore(CUSTOM_CATEGORIES_STORE_NAME);
  const request = objectStore.openCursor();

  let processedCount = 0;
  let migratedCount = 0;

  console.info("[IndexedDB] Starting migration to v7");

  request.onsuccess = () => {
    const cursor = request.result;

    if (!cursor) {
      console.info(
        `[IndexedDB] Migration to v7 completed: ${migratedCount} of ${processedCount} records migrated`,
      );
      return;
    }

    processedCount++;

    const record = cursor.value as CategoryRecord;
    const oldCategory = record.category;
    if (
      Object.hasOwn(oldCategory, "deleted") ||
      (Object.hasOwn(oldCategory, "hidden") && oldCategory.hidden)
    ) {
      const newCategory: CustomCategory = {
        id: oldCategory.id,
        name: oldCategory.name,
        icon: oldCategory.icon,
        color: oldCategory.color,
      };
      if (Object.hasOwn(oldCategory, "hidden") && oldCategory.hidden) {
        newCategory.hiddenAt = new Date().toISOString();
      }
      cursor.update({
        ...record,
        category: newCategory,
      });

      migratedCount++;
    }

    cursor.continue();
  };

  request.onerror = () => {
    console.error("[IndexedDB] Migration to v7 failed:", request.error);
  };
}
