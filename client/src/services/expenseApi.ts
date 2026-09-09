import axios from 'axios'
import { expenseApi } from '@/services/api'

export interface ExpenseApiBody {
  id: string
  amount?: number
  categoryId?: string
  createdAt: string
  description?: string
  paymentDate?: string
}

export interface CreateExpensePayload {
  id: string
  amount: number
  categoryId?: string,
  createdAt: string,
  description?: string
  paymentDate?: string
}

export interface UpdateExpenseRequest {
  amount?: number
  categoryId?: string
  description?: string
  paymentDate?: string
}

export interface BatchUpdateExpenseRequest extends UpdateExpenseRequest {
  id: string
}

export interface SyncExpensesRequest {
  create?: CreateExpensePayload[]
  update?: BatchUpdateExpenseRequest[]
  delete?: string[]
}

export async function getExpense(id: string): Promise<ExpenseApiBody | undefined> {
  try {
    const { data } = await expenseApi.get<ExpenseApiBody>(`/expenses/${id}`)
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return undefined
    }

    throw error
  }
}

export async function getExpensesByIds(ids: string[]): Promise<ExpenseApiBody[]> {
  if (ids.length === 0) {
    return []
  }

  try {
    const { data } = await expenseApi.get<ExpenseApiBody[]>('/expenses', {
      params: { ids: ids.join(',') }
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return []
    }

    throw error
  }
}

export async function getExpenses(): Promise<ExpenseApiBody[]> {
  const { data } = await expenseApi.get<ExpenseApiBody[]>('/expenses')
  return data
}

export async function createExpense(expense: CreateExpensePayload): Promise<void> {
  await expenseApi.post('/expenses', expense)
}

export async function createExpensesBatch(expenses: CreateExpensePayload[]): Promise<void> {
  if (expenses.length === 0) {
    return
  }

  await expenseApi.post('/expenses/batch', expenses)
}

export async function syncExpenses(request: SyncExpensesRequest): Promise<void> {
  await expenseApi.post('/expenses/sync', request)
}

export async function updateExpense(id: string, updates: UpdateExpenseRequest): Promise<void> {
  await expenseApi.patch(`/expenses/${id}`, updates)
}

export async function updateExpensesBatch(
  updates: BatchUpdateExpenseRequest[]
): Promise<void> {
  if (updates.length === 0) {
    return
  }

  await expenseApi.patch('/expenses/batch', updates)
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    await expenseApi.delete(`/expenses/${id}`)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return
    }

    throw error
  }
}

export async function deleteExpensesBatch(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return
  }

  await expenseApi.delete('/expenses/batch', { data: ids })
}
