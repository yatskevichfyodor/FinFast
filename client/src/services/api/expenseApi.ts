import axios from 'axios'
import { expenseApi } from '@/services/api/http'

export interface ExpenseApiBody {
  id: string
  amount?: number
  categoryId?: string
  customCategoryId?: string
  createdAt: string
  description?: string
  paymentDate?: string
  deletedAt?: string
}

export interface CreateExpensePayload {
  id: string
  amount: number
  categoryId?: string,
  customCategoryId?: string,
  createdAt: string,
  description?: string
  paymentDate?: string
}

export interface UpdateExpenseRequest {
  amount?: number
  categoryId?: string
  customCategoryId?: string
  clearCategory?: boolean
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

function normalizeInstant(value: string | undefined): string | undefined {
  if (!value) {
    return value
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`
  }

  const parsedValue = new Date(value)
  if (!Number.isNaN(parsedValue.getTime())) {
    return parsedValue.toISOString()
  }

  const legacyDateValue = value
    .replace(/T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, '')
    .replace(/\s+\([^)]*\)$/, '')
  const parsedLegacyValue = new Date(legacyDateValue)

  return Number.isNaN(parsedLegacyValue.getTime())
    ? value
    : parsedLegacyValue.toISOString()
}

function normalizeCreateExpense(expense: CreateExpensePayload): CreateExpensePayload {
  return {
    ...expense,
    createdAt: normalizeInstant(expense.createdAt)!,
    paymentDate: normalizeInstant(expense.paymentDate)
  }
}

function normalizeUpdateExpense<T extends UpdateExpenseRequest>(expense: T): T {
  return {
    ...expense,
    paymentDate: normalizeInstant(expense.paymentDate)
  }
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

export async function getExpensesForSync(): Promise<ExpenseApiBody[]> {
  const { data } = await expenseApi.get<ExpenseApiBody[]>('/expenses/sync')
  return data
}

export async function createExpense(expense: CreateExpensePayload): Promise<void> {
  await expenseApi.post('/expenses', normalizeCreateExpense(expense))
}

export async function syncExpenses(request: SyncExpensesRequest): Promise<void> {
  await expenseApi.post('/expenses/sync', {
    ...request,
    create: request.create?.map(normalizeCreateExpense),
    update: request.update?.map(normalizeUpdateExpense)
  })
}

export async function updateExpense(id: string, updates: UpdateExpenseRequest): Promise<void> {
  await expenseApi.patch(`/expenses/${id}`, normalizeUpdateExpense(updates))
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
