export interface Category {
  id: number
  name: string
  icon: string
}

export interface Expense {
  id: number
  amount: number
  categoryId?: number
  createdAt: string
}