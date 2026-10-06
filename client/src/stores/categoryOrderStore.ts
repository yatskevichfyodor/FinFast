import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useExpenseStore } from ".";
import type { Expense } from "@/types/expense";
import { countBy, orderBy } from "lodash-es";
import { createUserEntryStorage } from "@/utils/localStorage";

export type CategoryOrderStore = ReturnType<typeof createCategoryOrderStore>;

const CATEGORY_ORDER_STORAGE_KEY = "finfast-category-order";
const CATEGORY_ORDER_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

export interface StoredCategoryOrder {
  categoryIds: string[];
  updatedAt: number;
}

function calculatePopularCategoryIdsOrder(expenses: Expense[]): string[] {
  const expensesIdsToEffectiveCategoryId = expenses.map((expense) => ({
    id: expense.id,
    effectiveCategoryId: expense.customCategoryId ?? expense.categoryId,
  }));
  const categoryCounts = countBy(
    expensesIdsToEffectiveCategoryId.filter(it => it.effectiveCategoryId),
    "effectiveCategoryId",
  );
  const defaultOrder = Object.fromEntries(
    SYSTEM_CATEGORIES.map((category, index) => [category.id, index]),
  );
  return orderBy(
    SYSTEM_CATEGORIES,
    [
      (category) => categoryCounts[category.id] ?? 0,
      (category) => defaultOrder[category.id],
    ],
    ["desc", "asc"],
  ).map((category) => category.id);
}

export function createCategoryOrderStore(userId: string) {
  const expenseStore = useExpenseStore().value!;
  const categoryOrderStorage = createUserEntryStorage<string>(CATEGORY_ORDER_STORAGE_KEY, userId);

  function getCategoryOrder(): string[] | null {
    let storedCategoryOrder = readCategoryOrderFromStorage();
    if (!storedCategoryOrder || isCacheExpired(storedCategoryOrder.updatedAt)) {
        buildPopularCategoryOrder(expenseStore.expenses)
        storedCategoryOrder = readCategoryOrderFromStorage();
    }
    return storedCategoryOrder!.categoryIds;
  }

  function isCacheExpired(cacheUpdatedAt: number): boolean {
    return Date.now() - cacheUpdatedAt < CATEGORY_ORDER_REFRESH_INTERVAL_MS;
  }

  function readCategoryOrderFromStorage(): StoredCategoryOrder | null {
    try {
      const rawValue = categoryOrderStorage.get()
      if (!rawValue) {
        return null;
      }

      const parsedValue = JSON.parse(rawValue) as StoredCategoryOrder | null;
      if (
        !parsedValue ||
        !Array.isArray(parsedValue.categoryIds) ||
        parsedValue.categoryIds.length === 0 ||
        typeof parsedValue.updatedAt !== "number"
      ) {
        return null;
      }

      return parsedValue;
    } catch (error) {
      console.warn("Failed to read category order from localStorage", error);
      return null;
    }
  }
  
  function saveCategoryOrderToStorage(categoryOrder: StoredCategoryOrder) {
    try {
      categoryOrderStorage.save(JSON.stringify(categoryOrder))
    } catch (error) {
      console.warn("Failed to save category order to localStorage", error);
    }
  }

  function buildPopularCategoryOrder(expenses: Expense[]) {
    const categoryIds = calculatePopularCategoryIdsOrder(expenses);
    const newCategoryOrder = {
        categoryIds,
        updatedAt: Date.now(),
    }
    saveCategoryOrderToStorage(newCategoryOrder);
  }

  return {
    getCategoryOrder
  }
}
