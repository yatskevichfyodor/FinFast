import { CATEGORIES } from '@/constants/categories'
import type { Expense } from '@/types/expense'
import { categoryOrderStorage, CATEGORY_ORDER_REFRESH_INTERVAL_MS } from '@/stores/categoryOrderStorage'

export function sortCategoriesByOrder(categoryIds: string[]) {
  const orderMap = new Map<string, number>()
  categoryIds.forEach((categoryId, index) => {
    orderMap.set(categoryId, index)
  })

  return [...CATEGORIES].sort((left, right) => {
    const leftPriority = orderMap.get(left.id) ?? categoryIds.length
    const rightPriority = orderMap.get(right.id) ?? categoryIds.length

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return CATEGORIES.findIndex(category => category.id === left.id) -
      CATEGORIES.findIndex(category => category.id === right.id)
  })
}

export function calculatePopularCategoryOrder(expenses: Expense[]) {
  const categoryCounters = new Map<string, number>()

  for (const expense of expenses) {
    if (!expense.categoryId) {
      continue
    }

    categoryCounters.set(
      expense.categoryId,
      (categoryCounters.get(expense.categoryId) ?? 0) + 1
    )
  }

  return [...CATEGORIES]
    .sort((left, right) => {
      const leftCount = categoryCounters.get(left.id) ?? 0
      const rightCount = categoryCounters.get(right.id) ?? 0

      if (leftCount !== rightCount) {
        return rightCount - leftCount
      }

      return CATEGORIES.findIndex(category => category.id === left.id) -
        CATEGORIES.findIndex(category => category.id === right.id)
    })
    .map(category => category.id)
}

export function buildPopularCategoryOrder(expenses: Expense[]) {
  const storedOrder = categoryOrderStorage.readStoredCategoryOrder()
  const now = Date.now()

  if (storedOrder && now - storedOrder.updatedAt < CATEGORY_ORDER_REFRESH_INTERVAL_MS) {
    return sortCategoriesByOrder(storedOrder.categoryIds)
  }

  const categoryIds = calculatePopularCategoryOrder(expenses)
  categoryOrderStorage.writeStoredCategoryOrder(categoryIds)
  return sortCategoriesByOrder(categoryIds)
}
