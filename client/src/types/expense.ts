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
  /** When set, the expense is soft deleted on the server or deleted locally */
  deletedAt?: string
  /** whether the record has been synchronized with the API */
  isSynced: boolean
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

export interface ApiResponseExpenseDto {
  id: string;
  amount?: number;
  categoryId?: string;
  customCategoryId?: string;
  createdAt: string;
  description?: string;
  paymentDate?: string;
  deletedAt?: string;
}

export interface CreateExpenseDto {
  id: string;
  amount: number;
  categoryId?: string;
  customCategoryId?: string;
  createdAt: string;
  description?: string;
  paymentDate?: string;
}

export interface UpdateExpenseDto {
  amount?: number;
  categoryId?: string;
  customCategoryId?: string;
  clearCategory?: boolean;
  description?: string;
  paymentDate?: string;
}

export interface BatchUpdateExpenseDto extends UpdateExpenseDto {
  id: string;
}

export interface SyncExpensesDto {
  create?: CreateExpenseDto[];
  update?: BatchUpdateExpenseDto[];
  delete?: string[];
}
