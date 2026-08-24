import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'
const api = axios.create({ baseURL: API_BASE_URL })

export interface ExpenseApiBody {
  id: string
  amount?: number
  categoryId?: string
}

export interface CreateExpensePayload {
  id: string
  amount: number
  categoryId?: string,
  createdAt: string,
}

export interface UpdateExpenseRequest {
  amount?: number
  categoryId?: string
}

export interface BatchUpdateExpenseRequest extends UpdateExpenseRequest {
  id: string
}

export interface SyncExpensesRequest {
  create: CreateExpensePayload[]
  update: BatchUpdateExpenseRequest[]
  delete: string[]
}

export async function getExpense(id: string): Promise<ExpenseApiBody | undefined> {
  try {
    const { data } = await api.get<ExpenseApiBody>(`/expenses/${id}`)
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
    const { data } = await api.get<ExpenseApiBody[]>('/expenses', {
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

export async function createExpense(expense: CreateExpensePayload): Promise<void> {
  await api.post('/expenses', expense)
}

export async function createExpensesBatch(expenses: CreateExpensePayload[]): Promise<void> {
  if (expenses.length === 0) {
    return
  }

  await api.post('/expenses/batch', expenses)
}

export async function syncExpenses(request: SyncExpensesRequest): Promise<void> {
  await api.post('/expenses/sync', request)
}

export async function updateExpense(id: string, updates: UpdateExpenseRequest): Promise<void> {
  await api.patch(`/expenses/${id}`, updates)
}

export async function updateExpensesBatch(
  updates: BatchUpdateExpenseRequest[]
): Promise<void> {
  if (updates.length === 0) {
    return
  }

  await api.patch('/expenses/batch', updates)
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    await api.delete(`/expenses/${id}`)
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

  await api.delete('/expenses/batch', { data: ids })
}
