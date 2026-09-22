import { CATEGORIES } from '@/constants/categories'

export const CATEGORY_ORDER_STORAGE_KEY = 'finfast-category-order'
export const CATEGORY_ORDER_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface StoredCategoryOrder {
  categoryIds: string[]
  updatedAt: number
}

export const categoryOrderStorage = {
  readStoredCategoryOrder(): StoredCategoryOrder | null {
    try {
      const rawValue = localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY)
      if (!rawValue) {
        return null
      }

      const parsedValue = JSON.parse(rawValue) as Partial<StoredCategoryOrder> | null
      if (!parsedValue || !Array.isArray(parsedValue.categoryIds) || typeof parsedValue.updatedAt !== 'number') {
        return null
      }

      const validCategoryIds = parsedValue.categoryIds.filter(categoryId =>
        CATEGORIES.some(category => category.id === categoryId)
      )

      if (validCategoryIds.length === 0) {
        return null
      }

      return {
        categoryIds: validCategoryIds,
        updatedAt: parsedValue.updatedAt
      }
    } catch (error) {
      console.warn('Failed to read category order from localStorage', error)
      return null
    }
  },

  writeStoredCategoryOrder(categoryIds: string[]) {
    try {
      localStorage.setItem(
        CATEGORY_ORDER_STORAGE_KEY,
        JSON.stringify({
          categoryIds,
          updatedAt: Date.now()
        })
      )
    } catch (error) {
      console.warn('Failed to save category order to localStorage', error)
    }
  }
}