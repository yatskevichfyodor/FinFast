import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import * as expenseApi from '@/services/expenseApi'
import { loadExpenses as loadStoredExpenses, saveExpenses as saveStoredExpenses } from '@/services/expenseStorage'
import { useAuthStore } from '@/stores/auth'
import type { Expense, ExpensePayload } from '@/types/expense'

export type { Expense, ExpensePayload } from '@/types/expense'

export const useExpenseStore = defineStore('expense', () => {
  const authStore = useAuthStore()
  const expensesByUser = new Map<string, Expense[]>()
  const expenses = ref<Expense[]>([])
  let loadedUserId: string | null = null
  let loadVersion = 0

  async function loadExpenses() {
    const userId = authStore.userId
    const currentLoadVersion = ++loadVersion

    loadedUserId = null
    expenses.value = []

    if (!userId) {
      return
    }

    const cachedExpenses = expensesByUser.get(userId)
    if (cachedExpenses) {
      loadedUserId = userId
      expenses.value = cachedExpenses
      return
    }

    const storedExpenses = await loadStoredExpenses(userId)
    if (currentLoadVersion !== loadVersion || authStore.userId !== userId) {
      return
    }

    expensesByUser.set(userId, storedExpenses)
    loadedUserId = userId
    expenses.value = storedExpenses
  }

  watch(() => authStore.userId, () => {
    void loadExpenses().catch(error => {
      console.error('Failed to load expenses:', error)
    })
  }, { immediate: true })

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

    const { deleted, locallyDeleted, toUpdate, toCreate } = splitPendingExpenses(
      pendingExpenses,
      apiExpenseIds
    )
    const deletedExpenseIds = deleted.map(expense => expense.id)

    if (deletedExpenseIds.length > 0 || toUpdate.length > 0 || toCreate.length > 0) {
      const syncRequest: expenseApi.SyncExpensesRequest = {}

      if (toCreate.length > 0) {
        syncRequest.create = toCreate.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId,
          createdAt: expense.createdAt
        }))
      }

      if (toUpdate.length > 0) {
        syncRequest.update = toUpdate.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId
        }))
      }

      if (deletedExpenseIds.length > 0) {
        syncRequest.delete = deletedExpenseIds
      }

      await expenseApi.syncExpenses(syncRequest)

      toUpdate.forEach(expense => {
        expense.isSynced = true
      })
      toCreate.forEach(expense => {
        expense.isSynced = true
        expense.isCreatedLocally = false
      })
    }

    removeDeletedExpenses(
      new Set([
        ...deletedExpenseIds,
        ...locallyDeleted.map(expense => expense.id)
      ])
    )

    persistExpenses()
  }

  function getPendingExpenses() {
    if (loadedUserId !== authStore.userId) {
      return []
    }

    return expenses.value.filter(expense => !expense.isSynced)
  }

  function splitPendingExpenses(
    pendingExpenses: Expense[],
    apiExpenseIds: Set<string>
  ) {
    return {
      deleted: pendingExpenses.filter(
        expense => expense.isDeleted && apiExpenseIds.has(expense.id)
      ),
      locallyDeleted: pendingExpenses.filter(
        expense => expense.isDeleted && !apiExpenseIds.has(expense.id)
      ),
      toUpdate: pendingExpenses.filter(
        expense => !expense.isDeleted && apiExpenseIds.has(expense.id)
      ),
      toCreate: pendingExpenses.filter(
        expense => !expense.isDeleted && !apiExpenseIds.has(expense.id)
      )
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
    const userId = authStore.userId
    if (!userId || loadedUserId !== userId) {
      throw new Error('Cannot save expenses without a loaded user')
    }

    expensesByUser.set(userId, expenses.value)
    return saveStoredExpenses(userId, expenses.value)
  }

  function persistExpenses() {
    void saveExpenses().catch(error => {
      console.error('Failed to save expenses:', error)
    })
  }

  async function createExpenseDirectly(expense: Expense) {
    try {
      await expenseApi.createExpense({
        id: expense.id,
        amount: expense.amount,
        categoryId: expense.categoryId,
        createdAt: expense.createdAt
      })
      expense.isSynced = true
      expense.isCreatedLocally = false
      persistExpenses()
    } catch (error) {
      console.error('Failed to create expense:', error)
    }
  }

  async function updateExpenseDirectly(expense: Expense) {
    try {
      if (expense.isCreatedLocally) {
        await expenseApi.createExpense({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId,
          createdAt: expense.createdAt
        })
        expense.isCreatedLocally = false
      } else {
        await expenseApi.updateExpense(expense.id, {
          amount: expense.amount,
          categoryId: expense.categoryId
        })
      }
      expense.isSynced = true
      persistExpenses()
    } catch (error) {
      console.error('Failed to update expense:', error)
    }
  }

  async function deleteExpenseDirectly(
    expense: Expense,
    shouldDeleteOnApi: boolean
  ) {
    if (!shouldDeleteOnApi) {
      removeDeletedExpenses(new Set([expense.id]))
      persistExpenses()
      return
    }

    try {
      await expenseApi.deleteExpense(expense.id)
      removeDeletedExpenses(new Set([expense.id]))
      persistExpenses()
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  function hasOtherPendingExpenses(expenseId: string) {
    return getPendingExpenses().some(expense => expense.id !== expenseId)
  }

  function addExpense(payload: ExpensePayload): string {
    const hasPendingExpenses = getPendingExpenses().length > 0
    const newExpenseId = crypto.randomUUID();
    const expense: Expense = {
      id: newExpenseId,
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdAt: new Date().toISOString(),
      isSynced: false,
      isDeleted: false,
      isCreatedLocally: true
    }

    expenses.value.push(expense)
    persistExpenses()

    if (hasPendingExpenses) {
      // Sync in background without blocking
      queueExpensesSyncWithApi()
    } else {
      // Create directly when there are no other pending expenses
      createExpenseDirectly(expense)
    }

    return newExpenseId;
  }

  function updateExpense(payload: ExpensePayload) {
    if (payload.id === undefined) {
      return
    }

    const expenseId = payload.id
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)

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

    persistExpenses()

    if (hasPendingExpenses) {
      queueExpensesSyncWithApi()
    } else {
      updateExpenseDirectly(expenses.value[index]!)
    }
  }

  function updateExpenseCategory(
    expenseId: string,
    categoryId?: string
  ) {
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)
    const expense = expenses.value.find(
      expense => expense.id === expenseId
    )

    if (!expense) {
      return
    }

    expense.categoryId = categoryId
    expense.isSynced = false

    persistExpenses()

    if (hasPendingExpenses) {
      queueExpensesSyncWithApi()
    } else {
      updateExpenseDirectly(expense)
    }
  }

  function updateExpenseAmount(
    expenseId: string,
    amount: number
  ) {
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)
    const expense = expenses.value.find(
      expense => expense.id === expenseId
    )

    if (!expense) {
      return
    }

    expense.amount = amount
    expense.isSynced = false

    persistExpenses()

    if (hasPendingExpenses) {
      queueExpensesSyncWithApi()
    } else {
      updateExpenseDirectly(expense)
    }
  }

  function deleteExpense(id: string) {
    const hasPendingExpenses = hasOtherPendingExpenses(id)
    const expense = expenses.value.find(expense => expense.id === id)

    if (!expense) {
      return
    }

    const shouldDeleteOnApi = !expense.isCreatedLocally
    expense.isDeleted = true
    expense.isSynced = false

    persistExpenses()

    if (hasPendingExpenses) {
      queueExpensesSyncWithApi()
    } else {
      deleteExpenseDirectly(expense, shouldDeleteOnApi)
    }
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