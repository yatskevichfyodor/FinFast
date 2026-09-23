import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { expenseApi, type ExpenseApiBody, type SyncExpensesRequest } from '@/services/api/expenseApi'
import { expenseStorage } from '@/stores/expenseStorage/expenseStorage'
import { useAuthStore } from '@/stores/auth'
import type { Expense, ExpensePayload } from '@/types/expense'
import { isExpenseActive, normalizeExpense } from '@/types/expense'

export type { Expense, ExpensePayload } from '@/types/expense'

export const useExpenseStore = defineStore('expense', () => {
  const authStore = useAuthStore()
  const expensesByUser = new Map<string, Expense[]>()
  const expenses = ref<Expense[]>([])
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  let loadedUserId: string | null = null
  let loadVersion = 0

  function mapApiExpenseToLocal(apiExpense: ExpenseApiBody): Expense {
    return {
      id: apiExpense.id,
      amount: apiExpense.amount ?? 0,
      categoryId: apiExpense.categoryId,
      customCategoryId: apiExpense.customCategoryId,
      createdAt: apiExpense.createdAt,
      description: apiExpense.description,
      paymentDate: apiExpense.paymentDate,
      deletedAt: apiExpense.deletedAt,
      isSynced: true,
      isDeleted: false,
      isCreatedLocally: false
    }
  }

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

    const storedExpenses = (await expenseStorage.loadExpenses(userId)).map(normalizeExpense)
    if (currentLoadVersion !== loadVersion || authStore.userId !== userId) {
      return
    }

    expensesByUser.set(userId, storedExpenses)
    loadedUserId = userId
    expenses.value = storedExpenses
  }

  async function forceReloadExpenses() {
    const userId = authStore.userId
    if (!userId) {
      return
    }

    expensesByUser.delete(userId)
    await loadExpenses()
  }

  async function clearCurrentUserExpenses() {
    const userId = authStore.userId
    if (!userId) {
      return
    }

    loadVersion++
    expensesByUser.delete(userId)
    if (loadedUserId === userId) {
      loadedUserId = null
      expenses.value = []
    }
    await expenseStorage.saveExpenses(userId, [])
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
    })().finally(() => {
      syncPromise = null
    })

    return syncPromise
  }

  async function refreshExpenses() {
    const userId = authStore.userId
    if (!userId || authStore.isAnonymous || !authStore.accessToken) {
      return
    }

    await loadExpenses()

    try {
      await queueExpensesSyncWithApi()
      const apiExpenses = await expenseApi.getExpenses()
      const serverIds = new Set(apiExpenses.map(expense => expense.id))
      const pendingIds = new Set(getPendingExpenses().map(expense => expense.id))

      expenses.value = expenses.value.filter(expense => {
        if (pendingIds.has(expense.id)) {
          return true
        }
        if (expense.isCreatedLocally) {
          return true
        }
        if (!expense.isSynced) {
          return true
        }
        return serverIds.has(expense.id)
      })

      const localById = new Map(expenses.value.map(expense => [expense.id, expense]))
      for (const apiExpense of apiExpenses) {
        const local = localById.get(apiExpense.id)
        if (local && !local.isSynced) {
          continue
        }

        const mapped = mapApiExpenseToLocal(apiExpense)
        if (local) {
          Object.assign(local, mapped)
        } else {
          expenses.value.push(mapped)
        }
      }

      persistExpenses()
    } catch (error) {
      console.error('Failed to refresh expenses:', error)
    }
  }

  async function syncExpensesWithApi() {
    if (authStore.isAnonymous || !authStore.accessToken) {
      return
    }

    const pendingExpenses = getPendingExpenses()
    if (pendingExpenses.length === 0) {
      return
    }

    isSyncing.value = true
    syncError.value = null

    try {
      const apiExpenses = pendingExpenses.length > 0
        ? await expenseApi.getExpensesByIds(pendingExpenses.map(expense => expense.id))
        : []

      const {
        softDelete,
        toUpdate,
        toCreate,
        locallyDeleted
      } = splitPendingExpenses(pendingExpenses, apiExpenses)

      const syncRequest: SyncExpensesRequest = {}

      if (toCreate.length > 0) {
        syncRequest.create = toCreate.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId,
          customCategoryId: expense.customCategoryId,
          clearCategory: expense.clearCategory,
          createdAt: expense.createdAt,
          description: expense.description,
          paymentDate: expense.paymentDate
        }))
      }

      if (toUpdate.length > 0) {
        syncRequest.update = toUpdate.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          categoryId: expense.categoryId,
          customCategoryId: expense.customCategoryId,
          clearCategory: expense.clearCategory,
          description: expense.description,
          paymentDate: expense.paymentDate
        }))
      }

      if (softDelete.length > 0) {
        syncRequest.delete = softDelete.map(expense => expense.id)
      }

      if (
        syncRequest.create?.length ||
        syncRequest.update?.length ||
        syncRequest.delete?.length
      ) {
        await expenseApi.syncExpenses(syncRequest)
      }

      toUpdate.forEach(expense => {
        expense.isSynced = true
      })
      toCreate.forEach(expense => {
        expense.isSynced = true
        expense.isCreatedLocally = false
      })
      softDelete.forEach(expense => {
        expense.isSynced = true
        expense.isDeleted = false
      })
      removeExpensesLocally(locallyDeleted.map(expense => expense.id))

      persistExpenses()
    } catch (error) {
      syncError.value = 'Не удалось синхронизировать расходы'
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  function getPendingExpenses() {
    if (loadedUserId !== authStore.userId) {
      return []
    }

    return expenses.value.filter(expense => !expense.isSynced)
  }

  function getPendingExpensesCount() {
    return getPendingExpenses().length
  }

  function splitPendingExpenses(
    pendingExpenses: Expense[],
    apiExpenses: ExpenseApiBody[]
  ) {
    const apiById = new Map(apiExpenses.map(expense => [expense.id, expense]))

    return {
      softDelete: pendingExpenses.filter(expense => {
        const apiExpense = apiById.get(expense.id)
        return !!expense.deletedAt && !!apiExpense && !apiExpense.deletedAt
      }),
      toUpdate: pendingExpenses.filter(expense => {
        const apiExpense = apiById.get(expense.id)
        return isExpenseActive(expense) && !!apiExpense && !apiExpense.deletedAt
      }),
      toCreate: pendingExpenses.filter(expense => {
        return isExpenseActive(expense) && !apiById.has(expense.id)
      }),
      locallyDeleted: pendingExpenses.filter(expense => {
        return !!expense.deletedAt && expense.isCreatedLocally && !apiById.has(expense.id)
      })
    }
  }

  function removeExpensesLocally(expenseIds: string[]) {
    if (expenseIds.length === 0) {
      return
    }

    const ids = new Set(expenseIds)
    expenses.value = expenses.value.filter(expense => !ids.has(expense.id))
  }

  function saveExpenses() {
    const userId = authStore.userId
    if (!userId || loadedUserId !== userId) {
      throw new Error('Cannot save expenses without a loaded user')
    }

    expensesByUser.set(userId, expenses.value)
    return expenseStorage.saveExpenses(userId, expenses.value)
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
        customCategoryId: expense.customCategoryId,
        createdAt: expense.createdAt,
        description: expense.description,
        paymentDate: expense.paymentDate
      })
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
          customCategoryId: expense.customCategoryId,
          createdAt: expense.createdAt,
          description: expense.description,
          paymentDate: expense.paymentDate
        })
        expense.isCreatedLocally = false
      } else {
        await expenseApi.updateExpense(expense.id, {
          amount: expense.amount,
          categoryId: expense.categoryId,
          customCategoryId: expense.customCategoryId,
          clearCategory: expense.clearCategory,
          description: expense.description,
          paymentDate: expense.paymentDate
        })
      }
      expense.isSynced = true
      persistExpenses()
    } catch (error) {
      console.error('Failed to update expense:', error)
    }
  }

  async function deleteExpenseDirectly(expense: Expense, shouldDeleteOnApi: boolean) {
    if (!shouldDeleteOnApi) {
      removeExpensesLocally([expense.id])
      persistExpenses()
      return
    }

    try {
      await expenseApi.deleteExpense(expense.id)
      expense.deletedAt = expense.deletedAt ?? new Date().toISOString()
      expense.isSynced = true
      expense.isDeleted = false
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
    const newExpenseId = crypto.randomUUID()
    const expense: Expense = {
      id: newExpenseId,
      amount: payload.amount,
      categoryId: payload.categoryId,
      customCategoryId: payload.customCategoryId,
      createdAt: new Date().toISOString(),
      description: payload.description,
      paymentDate: payload.paymentDate,
      isSynced: false,
      isDeleted: false,
      isCreatedLocally: true
    }

    expenses.value.push(expense)
    persistExpenses()

    if (hasPendingExpenses) {
      void queueExpensesSyncWithApi().catch(error => {
        console.error('Failed to sync expenses:', error)
      })
    } else {
      expense.isSynced = true
      persistExpenses()
      createExpenseDirectly(expense).catch(() => {
        expense.isSynced = false
        persistExpenses()
      })
    }

    return newExpenseId
  }

  function updateExpense(payload: ExpensePayload) {
    if (payload.id === undefined) {
      return
    }

    const expenseId = payload.id
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)
    const index = expenses.value.findIndex(expense => expense.id === expenseId)

    if (index === -1) {
      return
    }

    expenses.value[index] = {
      ...expenses.value[index]!,
      amount: payload.amount,
      categoryId: payload.categoryId,
      customCategoryId: payload.customCategoryId,
      clearCategory: payload.clearCategory,
      description: payload.description,
      paymentDate: payload.paymentDate,
      isSynced: false
    }

    persistExpenses()

    if (hasPendingExpenses) {
      void queueExpensesSyncWithApi().catch(error => {
        console.error('Failed to sync expenses:', error)
      })
    } else {
      updateExpenseDirectly(expenses.value[index]!)
    }
  }

  function updateExpenseCategory(expenseId: string, categoryId?: string) {
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)
    const expense = expenses.value.find(item => item.id === expenseId)

    if (!expense) {
      return
    }

    expense.categoryId = categoryId
    expense.isSynced = false
    persistExpenses()

    if (hasPendingExpenses) {
      void queueExpensesSyncWithApi().catch(error => {
        console.error('Failed to sync expenses:', error)
      })
    } else {
      updateExpenseDirectly(expense)
    }
  }

  function updateExpenseAmount(expenseId: string, amount: number) {
    const hasPendingExpenses = hasOtherPendingExpenses(expenseId)
    const expense = expenses.value.find(item => item.id === expenseId)

    if (!expense) {
      return
    }

    expense.amount = amount
    expense.isSynced = false
    persistExpenses()

    if (hasPendingExpenses) {
      void queueExpensesSyncWithApi().catch(error => {
        console.error('Failed to sync expenses:', error)
      })
    } else {
      updateExpenseDirectly(expense)
    }
  }

  function deleteExpense(id: string) {
    const hasPendingExpenses = hasOtherPendingExpenses(id)
    const expense = expenses.value.find(item => item.id === id)

    if (!expense) {
      return
    }

    expense.deletedAt = new Date().toISOString()
    expense.isDeleted = false
    expense.isSynced = false
    persistExpenses()

    if (hasPendingExpenses) {
      void queueExpensesSyncWithApi().catch(error => {
        console.error('Failed to sync expenses:', error)
      })
    } else if (!expense.isCreatedLocally) {
      deleteExpenseDirectly(expense, true)
    } else {
      deleteExpenseDirectly(expense, false)
    }
  }

  function getExpenseById(id: string) {
    return expenses.value.find(expense => expense.id === id)
  }

  async function syncUnsyncedExpenses() {
    await queueExpensesSyncWithApi()
  }

  async function transferAnonymousExpenses() {
    if (!authStore.userId || authStore.isAnonymous) {
      return 0
    }

    const anonymousProfile = localStorage.getItem('finfast-anonymous-profile')
    if (!anonymousProfile) {
      return 0
    }

    const anonymousUserId = `anonymous:${anonymousProfile}`
    const anonymousExpenses = (await expenseStorage.loadExpenses(anonymousUserId)).map(normalizeExpense)
    if (anonymousExpenses.length === 0) {
      return 0
    }

    const currentExpenses = (await expenseStorage.loadExpenses(authStore.userId)).map(normalizeExpense)
    const existingIds = new Set(currentExpenses.map(expense => expense.id))
    const transferredExpenses = anonymousExpenses.filter(expense => !existingIds.has(expense.id))
    await expenseStorage.saveExpenses(authStore.userId, [...currentExpenses, ...transferredExpenses])
    await loadExpenses()
    await syncUnsyncedExpenses()
    await expenseStorage.saveExpenses(anonymousUserId, [])
    localStorage.removeItem('finfast-anonymous-profile')
    return transferredExpenses.length
  }

  function initializeOnlineSync() {
    const sync = () => {
      if (navigator.onLine && authStore.isAuthenticated && !authStore.isAnonymous) {
        void refreshExpenses().catch(error => console.error('Failed to sync expenses:', error))
      }
    }
    window.addEventListener('online', sync)
    sync()
  }

  initializeOnlineSync()

  return {
    expenses,
    isSyncing,
    syncError,
    loadExpenses,
    forceReloadExpenses,
    clearCurrentUserExpenses,
    refreshExpenses,
    addExpense,
    updateExpense,
    updateExpenseCategory,
    updateExpenseAmount,
    deleteExpense,
    getExpenseById,
    getPendingExpensesCount,
    transferAnonymousExpenses,
    syncUnsyncedExpenses,
    persistExpenses,
    updateExpenseDirectly
  }
})
