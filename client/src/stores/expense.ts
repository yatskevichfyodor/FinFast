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
      expenses.value = parsedExpenses
    } catch {
      expenses.value = []
    }
  }

  // Load expenses from localStorage on store initialization
  loadExpenses()

  let syncPromise: Promise<void> | null = null
  let syncRequested = false

  async function queueExpensesSyncWithApi(): Promise<void> {
    syncRequested = true

    if (syncPromise) {
      return syncPromise
    }

    syncPromise = (async () => {
      while (syncRequested) {
        syncRequested = false

        await syncExpensesWithApi()
      }
    })()
      .catch(error => {
        console.error('Failed to sync expenses:', error)
      })
      .finally(() => {
        syncPromise = null
      })

    return syncPromise
  }

  async function syncExpensesWithApi() {
    const pendingExpenses = getPendingExpenses()

    if (pendingExpenses.length === 0) {
      return
    }

    const apiExpenses = await expenseApi.getExpensesByIds(pendingExpenses.map(expense => expense.id))
    const apiExpenseIds = new Set(apiExpenses.map(apiExpense => apiExpense.id))

    const { deleted, toUpdate, toCreate } = splitPendingExpenses(
      pendingExpenses,
      apiExpenseIds
    )
    const [deletedExpenseIds] = await Promise.all([
      syncDeletedExpenses(deleted),
      syncUpdatedExpenses(toUpdate),
      syncCreatedExpenses(toCreate)
    ])
    removeDeletedExpenses(deletedExpenseIds)

    saveExpenses()
  }

  function getPendingExpenses() {
    loadExpenses()
    return expenses.value.filter(expense => !expense.isSynced)
  }

  function splitPendingExpenses(
    pendingExpenses: Expense[],
    apiExpenseIds: Set<string>
  ) {
    return {
      deleted: pendingExpenses.filter(expense => expense.isDeleted),
      toUpdate: pendingExpenses.filter(
        expense => !expense.isDeleted && apiExpenseIds.has(expense.id)
      ),
      toCreate: pendingExpenses.filter(
        expense => !expense.isDeleted && !apiExpenseIds.has(expense.id)
      )
    }
  }

  async function syncDeletedExpenses(deletedExpenses: Expense[]) {
    if (deletedExpenses.length === 0) {
      return new Set<string>()
    }

    try {
      const deletedExpensesIds = deletedExpenses.map(expense => expense.id)
      await expenseApi.deleteExpensesBatch(deletedExpensesIds)
      return new Set(deletedExpensesIds)
    } catch (error) {
      console.error('Failed to delete expenses batch:', error)
      return new Set<string>()
    }
  }

  async function syncUpdatedExpenses(expensesToUpdate: Expense[]) {
    if (expensesToUpdate.length === 0) {
      return
    }

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

  async function syncCreatedExpenses(expensesToCreate: Expense[]) {
    if (expensesToCreate.length === 0) {
      return
    }

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

  function removeDeletedExpenses(deletedExpenseIds: Set<string>) {
    if (deletedExpenseIds.size === 0) {
      return
    }

    expenses.value = expenses.value.filter(
      expense => !deletedExpenseIds.has(expense.id)
    )
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
    queueExpensesSyncWithApi()

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
    queueExpensesSyncWithApi()
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
    queueExpensesSyncWithApi()
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
    queueExpensesSyncWithApi()
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
    queueExpensesSyncWithApi()
  }

  function getExpenseById(id: string) {
    return expenses.value.find(
      expense => expense.id === id
    )
  }

  async function syncUnsyncedExpenses() {
    await queueExpensesSyncWithApi()
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