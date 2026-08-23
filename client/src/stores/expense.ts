import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as expenseApi from '@/services/expenseApi'

export interface Expense {
  id: string
  amount: number
  categoryId?: string
  createdAt: string
  isSynced: boolean
}

export interface ExpensePayload {
  id?: string
  amount: number
  categoryId?: string
}

const STORAGE_KEY = 'finfast-expenses'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref<Expense[]>([])

  function loadExpenses() {
    const savedExpenses = localStorage.getItem(STORAGE_KEY)

    if (!savedExpenses) {
      return
    }

    try {
      const parsedExpenses = JSON.parse(savedExpenses) as Expense[]
      // Ensure all expenses have isSynced field (for backward compatibility)
      expenses.value = parsedExpenses.map(expense => ({
        ...expense,
        isSynced: expense.isSynced ?? false
      }))
    } catch {
      expenses.value = []
    }
  }

  // Load expenses from localStorage on store initialization
  loadExpenses()

  async function syncExpenseWithApi(expense: Expense, apiCall: () => Promise<void>) {
    try {
      await apiCall()
      expense.isSynced = true
    } catch (error) {
      console.error('Failed to sync expense with API:', error)
    }
  }

  function saveExpenses() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(expenses.value)
    )
  }

  async function addExpense(payload: ExpensePayload): Promise<string> {
    const newExpenseId = crypto.randomUUID();
    const expense: Expense = {
      id: newExpenseId,
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdAt: new Date().toISOString(),
      isSynced: false
    }

    expenses.value.push(expense)

    await syncExpenseWithApi(expense, () =>
      expenseApi.createExpense({
        id: newExpenseId,
        amount: payload.amount,
        categoryId: payload.categoryId
      })
    )

    saveExpenses()
    return newExpenseId;
  }

  async function updateExpense(payload: ExpensePayload) {
    if (payload.id === undefined) {
      return
    }

    const index = expenses.value.findIndex(
      expense => expense.id === payload.id
    )

    if (index === -1) {
      return
    }

    expenses.value[index] = {
      ...expenses.value[index]!,
      amount: payload.amount,
      categoryId: payload.categoryId,
      isSynced: false
    }

    await syncExpenseWithApi(expenses.value[index]!, () =>
      expenseApi.updateExpense(payload.id, {
        amount: payload.amount,
        categoryId: payload.categoryId
      })
    )

    saveExpenses()
  }

  async function updateExpenseCategory(
    expenseId: string,
    categoryId?: string
  ) {
    const expense = expenses.value.find(
      expense => expense.id === expenseId
    )

    if (!expense) {
      return
    }

    expense.categoryId = categoryId
    expense.isSynced = false

    await syncExpenseWithApi(expense, () =>
      expenseApi.updateExpense(expenseId, {
        categoryId: categoryId
      })
    )

    saveExpenses()
  }

  async function updateExpenseAmount(
    expenseId: string,
    amount: number
  ) {
    const expense = expenses.value.find(
      expense => expense.id === expenseId
    )

    if (!expense) {
      return
    }

    expense.amount = amount
    expense.isSynced = false

    await syncExpenseWithApi(expense, () =>
      expenseApi.updateExpense(expenseId, {
        amount: amount
      })
    )

    saveExpenses()
  }

  async function deleteExpense(id: string) {
    // Try to sync with API first
    try {
      await expenseApi.deleteExpense(id)
    } catch (error) {
      console.error('Failed to sync expense deletion with API:', error)
      // Continue with local deletion even if API sync fails
    }

    expenses.value = expenses.value.filter(
      expense => expense.id !== id
    )

    saveExpenses()
  }

  function getExpenseById(id: string) {
    return expenses.value.find(
      expense => expense.id === id
    )
  }

  async function syncUnsyncedExpenses() {
    const unsyncedExpenses = expenses.value.filter(expense => !expense.isSynced)

    for (const expense of unsyncedExpenses) {
      try {
        // Try to create the expense first (in case it was never synced)
        await expenseApi.createExpense({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId
        })
        expense.isSynced = true
      } catch (createError) {
        // If create fails, try to update (expense might already exist on server)
        try {
          await expenseApi.updateExpense(expense.id, {
            amount: expense.amount,
            categoryId: expense.categoryId
          })
          expense.isSynced = true
        } catch (updateError) {
          console.error(`Failed to sync expense ${expense.id}:`, updateError)
        }
      }
    }

    saveExpenses()
  }

  return {
    expenses,
    loadExpenses,
    addExpense,
    updateExpense,
    updateExpenseCategory,
    updateExpenseAmount,
    deleteExpense,
    getExpenseById,
    syncUnsyncedExpenses
  }
})