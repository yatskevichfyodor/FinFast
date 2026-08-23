import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as expenseApi from '@/services/expenseApi'

export interface Expense {
  id: string
  amount: number
  categoryId?: string
  createdAt: string
  isSynced: boolean
  isDeleted: boolean
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
        isSynced: expense.isSynced ?? false,
        isDeleted: expense.isDeleted ?? false
      }))
    } catch {
      expenses.value = []
    }
  }

  // Load expenses from localStorage on store initialization
  loadExpenses()

  async function syncExpenseWithApi() {
    try {
      loadExpenses()
      const unsyncedExpenses = expenses.value.filter(expense => !expense.isSynced)
      const apiExpenses = await expenseApi.getExpensesByIds(
        unsyncedExpenses.map(expense => expense.id)
      )
      const apiExpenseIds = new Set(
        apiExpenses
          .map(expense => expense.id)
          .filter((id): id is string => id !== undefined)
      )
      const deletedExpenseIds = new Set<string>()

      for (const unsyncedExpense of unsyncedExpenses) {
        try {
          if (unsyncedExpense.isDeleted) {
            await expenseApi.deleteExpense(unsyncedExpense.id)
            deletedExpenseIds.add(unsyncedExpense.id)
            continue
          }

          if (apiExpenseIds.has(unsyncedExpense.id)) {
            await expenseApi.updateExpense(unsyncedExpense.id, {
              amount: unsyncedExpense.amount,
              categoryId: unsyncedExpense.categoryId
            })
          } else {
            await expenseApi.createExpense({
              id: unsyncedExpense.id,
              amount: unsyncedExpense.amount,
              categoryId: unsyncedExpense.categoryId,
              createdAt: unsyncedExpense.createdAt
            })
          }

          unsyncedExpense.isSynced = true
        } catch (error) {
          console.error(`Failed to sync expense ${unsyncedExpense.id}:`, error)
        }
      }

      if (deletedExpenseIds.size > 0) {
        expenses.value = expenses.value.filter(
          expense => !deletedExpenseIds.has(expense.id)
        )
      }

      saveExpenses()
    } catch (error) {
      console.error('Failed to sync expenses with API:', error)
    }
  }

  function saveExpenses() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(expenses.value)
    )
  }

  function addExpense(payload: ExpensePayload): string {
    const newExpenseId = crypto.randomUUID();
    const expense: Expense = {
      id: newExpenseId,
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdAt: new Date().toISOString(),
      isSynced: false,
      isDeleted: false
    }

    expenses.value.push(expense)
    saveExpenses()

    // Sync in background without blocking
    syncExpenseWithApi()

    return newExpenseId;
  }

  function updateExpense(payload: ExpensePayload) {
    if (payload.id === undefined) {
      return
    }

    const expenseId = payload.id

    const index = expenses.value.findIndex(
      expense => expense.id === expenseId
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

    saveExpenses()

    // Sync in background without blocking
    syncExpenseWithApi()
  }

  function updateExpenseCategory(
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

    saveExpenses()

    // Sync in background without blocking
    syncExpenseWithApi()
  }

  function updateExpenseAmount(
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

    saveExpenses()

    // Sync in background without blocking
    syncExpenseWithApi()
  }

  function deleteExpense(id: string) {
    const expense = expenses.value.find(expense => expense.id === id)

    if (!expense) {
      return
    }

    expense.isDeleted = true
    expense.isSynced = false

    saveExpenses()

    // Sync deletion in background without blocking
    syncExpenseWithApi()
  }

  function getExpenseById(id: string) {
    return expenses.value.find(
      expense => expense.id === id
    )
  }

  async function syncUnsyncedExpenses() {
    await syncExpenseWithApi()
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