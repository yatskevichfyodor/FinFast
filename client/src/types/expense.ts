export interface Expense {
  id: string
  amount: number
  categoryId?: string
  customCategoryId?: string
  /** Explicitly removes both system and custom category assignments during update. */
  clearCategory?: boolean
  createdAt: string
  description?: string
  paymentDate?: string
  // whether the record has been synchronized with the API
  isSynced: boolean
  // field for deletion syncronization, record will be deleted after synchronization
  isDeleted: boolean
  // a record that has not yet been posted to the API and that needs to be deleted locally
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