import { SYSTEM_CATEGORIES } from '@/constants/categories'
import { categoryOrderCache } from '@/stores/categoryOrderCache'
import type { Expense } from '@/types/expense'

function sortCategoriesByOrder(categoryIds: string[]) {
  const orderMap = new Map<string, number>()
  categoryIds.forEach((categoryId, index) => {
    orderMap.set(categoryId, index)
  })

  return [...SYSTEM_CATEGORIES].sort((left, right) => {
    const leftPriority = orderMap.get(left.id) ?? categoryIds.length
    const rightPriority = orderMap.get(right.id) ?? categoryIds.length

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return SYSTEM_CATEGORIES.findIndex(category => category.id === left.id) -
      SYSTEM_CATEGORIES.findIndex(category => category.id === right.id)
  })
}

function calculatePopularCategoryOrder(expenses: Expense[]) {
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

  return [...SYSTEM_CATEGORIES]
    .sort((left, right) => {
      const leftCount = categoryCounters.get(left.id) ?? 0
      const rightCount = categoryCounters.get(right.id) ?? 0

      if (leftCount !== rightCount) {
        return rightCount - leftCount
      }

      return SYSTEM_CATEGORIES.findIndex(category => category.id === left.id) -
        SYSTEM_CATEGORIES.findIndex(category => category.id === right.id)
    })
    .map(category => category.id)
}

export function buildPopularCategoryOrder(expenses: Expense[]) {
  const cachedCategoryOrder = categoryOrderCache.get();

  if (cachedCategoryOrder) {
    return sortCategoriesByOrder(cachedCategoryOrder.categoryIds)
  }

  const categoryIds = calculatePopularCategoryOrder(expenses)
  categoryOrderCache.write(categoryIds)
  return sortCategoriesByOrder(categoryIds)
}
