import { SYSTEM_CATEGORIES } from '@/constants/categories'
import { categoryOrderCache } from '@/storage/categoryOrderCache'
import type { Expense } from '@/types/expense'
import { countBy, orderBy } from 'lodash-es'

// order categories by popularity, then by default order
function calculatePopularCategoryOrder(expenses: Expense[]): string[] {
  const categoryCounts = countBy(expenses.filter(expense => expense.categoryId), 'categoryId')
  const defaultOrder = Object.fromEntries(SYSTEM_CATEGORIES.map((category, index) => [category.id, index]) )
  return orderBy(SYSTEM_CATEGORIES, [
    category => categoryCounts[category.id] ?? 0,
    category => defaultOrder[category.id]
  ], ['desc', 'asc']
  ).map(category => category.id)
}

export function buildPopularCategoryOrder(expenses: Expense[]) {
  const cachedCategoryOrder = categoryOrderCache.get();

  if (cachedCategoryOrder) {
    return cachedCategoryOrder.categoryIds
  }

  const categoryIds = calculatePopularCategoryOrder(expenses)
  categoryOrderCache.write(categoryIds)
  return categoryIds
}
