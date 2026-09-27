import { SYSTEM_CATEGORIES } from "@/constants/categories";

const CATEGORY_ORDER_STORAGE_KEY = "finfast-category-order";
const CATEGORY_ORDER_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

export interface StoredCategoryOrder {
  categoryIds: string[];
  updatedAt: number;
}

function readStoredCategoryOrder(): StoredCategoryOrder | null {
  try {
    const rawValue = localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(
      rawValue,
    ) as Partial<StoredCategoryOrder> | null;
    if (
      !parsedValue ||
      !Array.isArray(parsedValue.categoryIds) ||
      typeof parsedValue.updatedAt !== "number"
    ) {
      return null;
    }

    const validCategoryIds = parsedValue.categoryIds.filter((categoryId) =>
      SYSTEM_CATEGORIES.some((category) => category.id === categoryId),
    );

    if (validCategoryIds.length === 0) {
      return null;
    }

    return {
      categoryIds: validCategoryIds,
      updatedAt: parsedValue.updatedAt,
    };
  } catch (error) {
    console.warn("Failed to read category order from localStorage", error);
    return null;
  }
}

export const categoryOrderCache = {
  get(): StoredCategoryOrder | null {
    const storedOrder = readStoredCategoryOrder();
    const now = Date.now();
    if (
      storedOrder &&
      now - storedOrder.updatedAt < CATEGORY_ORDER_REFRESH_INTERVAL_MS
    ) {
      return storedOrder;
    }
    return null;
  },

  write(categoryIds: string[]) {
    try {
      localStorage.setItem(
        CATEGORY_ORDER_STORAGE_KEY,
        JSON.stringify({
          categoryIds,
          updatedAt: Date.now(),
        }),
      );
    } catch (error) {
      console.warn("Failed to save category order to localStorage", error);
    }
  },
};
