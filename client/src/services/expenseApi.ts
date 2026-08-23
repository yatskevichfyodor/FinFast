import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'
const api = axios.create({ baseURL: API_BASE_URL })

export interface ExpenseApiBody {
  id: string
  amount?: number
  categoryId?: string
}

export interface CreateExpenseRequest {
  id: string
  amount: number
  categoryId?: string
}

export interface UpdateExpenseRequest {
  amount?: number
  categoryId?: string
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

  const { data } = await api.get<ExpenseApiBody[]>('/expenses', {
    params: { ids: ids.join(',') }
  })
  return data
}

export async function createExpense(expense: CreateExpenseRequest): Promise<void> {
  await api.post('/expenses', expense)
}

export async function updateExpense(id: string, updates: UpdateExpenseRequest): Promise<void> {
  await api.patch(`/expenses/${id}`, updates)
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`)
}
