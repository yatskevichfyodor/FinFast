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

  let syncPromise: Promise<void> | null = null
  let syncRequested = false

  async function syncExpenseWithApi() {
    if (syncPromise) {
      syncRequested = true
      return syncPromise
    }

    syncPromise = (async () => {
      do {
        syncRequested = false
        await syncExpensesBatch()
      } while (syncRequested)
    })()
      .catch(error => {
        console.error('Failed to sync expenses with API:', error)
      })
      .finally(() => {
        syncPromise = null
      })

    return syncPromise
  }

  async function syncExpensesBatch() {
    loadExpenses()
    const unsyncedExpenses = expenses.value.filter(expense => !expense.isSynced)

    if (unsyncedExpenses.length === 0) {
      return
    }

    const apiExpenses = await expenseApi.getExpensesByIds(
      unsyncedExpenses.map(expense => expense.id)
    )
    const apiExpenseIds = new Set(
      apiExpenses
        .map(apiExpense => apiExpense.id)
        .filter((id): id is string => id !== undefined)
    )

    const deletedExpenses = unsyncedExpenses.filter(expense => expense.isDeleted)
    const expensesToUpdate = unsyncedExpenses.filter(
      expense => !expense.isDeleted && apiExpenseIds.has(expense.id)
    )
    const expensesToCreate = unsyncedExpenses.filter(
      expense => !expense.isDeleted && !apiExpenseIds.has(expense.id)
    )

    const deletedExpenseIds = new Set<string>()

    if (deletedExpenses.length > 0) {
      try {
        await expenseApi.deleteExpensesBatch(
          deletedExpenses.map(expense => expense.id)
        )
        deletedExpenses.forEach(expense => deletedExpenseIds.add(expense.id))
      } catch (error) {
        console.error('Failed to delete expenses batch:', error)
      }
    }

    if (expensesToUpdate.length > 0) {
      try {
        await expenseApi.updateExpensesBatch(
          expensesToUpdate.map(expense => ({
            id: expense.id,
            amount: expense.amount,
            categoryId: expense.categoryId
          }))
        )
        expensesToUpdate.forEach(expense => {
          expense.isSynced = true
        })
      } catch (error) {
        console.error('Failed to update expenses batch:', error)
      }
    }

    if (expensesToCreate.length > 0) {
      try {
        await expenseApi.createExpensesBatch(
          expensesToCreate.map(expense => ({
            id: expense.id,
            amount: expense.amount,
            categoryId: expense.categoryId,
            createdAt: expense.createdAt
          }))
        )
        expensesToCreate.forEach(expense => {
          expense.isSynced = true
        })
      } catch (error) {
        console.error('Failed to create expenses batch:', error)
      }
    }

    if (deletedExpenseIds.size > 0) {
      expenses.value = expenses.value.filter(
        expense => !deletedExpenseIds.has(expense.id)
      )
    }

    saveExpenses()
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