export interface Expense {
  id: string
  amount: number
  categoryId?: string
  customCategoryId?: string
  /** Explicitly removes both system and custom category assignments during update. */
  clearCategory?: boolean
  /** Creation timestamp in ISO 8601 UTC format, e.g. "2026-09-22T15:42:31.847Z". */
  createdAt: string
  description?: string
  /** Payment date in ISO 8601 date format (YYYY-MM-DD), without time or timezone. */
  paymentDate?: string
  /** When set, the expense is in trash. Synced with the server. */
  deletedAt?: string
  /** whether the record has been synchronized with the API */
  isSynced: boolean
  /** @deprecated Use deletedAt instead. Kept for IndexedDB migration. */
  isDeleted: boolean
  /** a record that has not yet been posted to the API */
  isCreatedLocally: boolean
}

export interface ExpensePayload {
  id?: string
  amount: number
  categoryId?: string
  customCategoryId?: string
  /** Explicitly removes both system and custom category assignments during update. */
  clearCategory?: boolean
  description?: string
  paymentDate?: string
}

export function isExpenseDeleted(expense: Expense): boolean {
  return !!expense.deletedAt
}

export function isExpenseActive(expense: Expense): boolean {
  return !expense.deletedAt
}

export function normalizeExpense(expense: Expense): Expense {
  if (expense.isDeleted && !expense.deletedAt) {
    return { ...expense, deletedAt: new Date().toISOString() }
  }
  return expense
}
