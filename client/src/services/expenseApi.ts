const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export interface ExpenseApiBody {
  id?: string
  amount?: number
  categoryId?: string
}

export async function createExpense(expense: ExpenseApiBody): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expense),
  })

  if (!response.ok) {
    throw new Error(`Failed to create expense: ${response.statusText}`)
  }
}

export async function updateExpense(id: string, updates: ExpenseApiBody): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error(`Failed to update expense: ${response.statusText}`)
  }
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete expense: ${response.statusText}`)
  }
}

export async function getExpense(id: string): Promise<ExpenseApiBody> {
  const response = await fetch(`${API_BASE_URL}/expenses/${id}`)

  if (!response.ok) {
    throw new Error(`Failed to get expense: ${response.statusText}`)
  }

  return response.json()
}
