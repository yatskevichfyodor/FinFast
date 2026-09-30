import { onScopeDispose, ref, watch } from "vue";
import { defineStore } from "pinia";
import { expenseApi } from "@/services/api/expenseApi";
import { expenseStorage } from "@/storage/indexedDB";
import { useAuthStore } from "@/stores/authStore";
import type {
  Expense,
  ApiResponseExpenseDto,
  SyncExpensesDto,
  ExpenseUpdatePayload,
  CreateExpensePayload,
} from "@/types/expense";
import { createSequentialByKeys } from "@/utils/sequentialByKeys";
import { createCoalescedOperation } from "@/utils/coalescedOperation";
import {
  mapExpenseToBatchUpdateDto,
  mapExpenseToCreateDto,
  mapExpenseToUpdateDto,
  parseApiExpense,
} from "@/mappers/expenseMappers";
import { createStoreStateGuard } from "@/utils/storeStateGuard";

type SplitPendingExpensesResult = {
  toCreate: Expense[];
  toUpdate: Expense[];
  toDelete: Expense[];
  locallyDeleted: Expense[];
};

export const useExpenseStore = defineStore("expense", () => {
  const authStore = useAuthStore();
  const expenses = ref<Expense[]>([]);
  const syncError = ref<string | null>(null);
  let loadedUserId: string | null = null;

  const sequentialExpenseOperation = createSequentialByKeys<string>();
  const { storeStateGuard, invalidateState } = createStoreStateGuard(
    () => authStore.userId,
  );

  async function loadExpensesFromStorage() {
    loadedUserId = null;
    expenses.value = [];

    const currentUserId = authStore.userId;
    if (!currentUserId) {
      return;
    }

    await storeStateGuard(
      async () => await expenseStorage.loadExpenses(currentUserId),
      (storedExpenses: Expense[]) => {
        expenses.value = storedExpenses;
        loadedUserId = currentUserId;
      },
    );
  }

  function saveExpensesToStorage() {
    const userId = authStore.userId;
    if (!userId || loadedUserId !== userId) {
      console.error("Cannot save expenses without a loaded user");
      throw new Error("Cannot save expenses without a loaded user");
    }

    return expenseStorage.saveExpenses(userId, expenses.value);
  }

  async function clearCurrentUserExpenses() {
    const userId = authStore.userId;
    if (!userId) {
      return;
    }

    invalidateState();
    if (loadedUserId === userId) {
      loadedUserId = null;
      expenses.value = [];
    }
    await expenseStorage.saveExpenses(userId, []);
  }

  watch(
    () => authStore.userId,
    () => {
      void loadExpensesFromStorage().catch((error) => {
        console.error("Failed to load expenses:", error);
      });
    },
    { immediate: true },
  );

  const syncExpenses = createCoalescedOperation(async () => {
    if (authStore.isAnonymous || !authStore.accessToken) {
      return;
    }

    const notSyncedExpenses = getNotSyncedExpenses();
    if (notSyncedExpenses.length === 0) {
      return;
    }

    const notSyncedExpensesIds = notSyncedExpenses.map((expense) => expense.id);

    await sequentialExpenseOperation.byKeys(notSyncedExpensesIds, async () => {
      syncError.value = null;

      try {
        const apiExpenses =
          await expenseApi.getExpensesByIds(notSyncedExpensesIds);

        const { toCreate, toUpdate, toDelete, locallyDeleted } =
          splitPendingExpenses(notSyncedExpenses, apiExpenses);

        const syncRequest: SyncExpensesDto = {};

        if (toCreate.length > 0) {
          syncRequest.create = toCreate.map(mapExpenseToCreateDto);
        }

        if (toUpdate.length > 0) {
          syncRequest.update = toUpdate.map(mapExpenseToBatchUpdateDto);
        }

        if (toDelete.length > 0) {
          syncRequest.delete = toDelete.map((expense) => expense.id);
        }

        if (
          syncRequest.create?.length ||
          syncRequest.update?.length ||
          syncRequest.delete?.length
        ) {
          await expenseApi.syncExpenses(syncRequest);
        }

        toUpdate.forEach((expense) => {
          expense.isSynced = true;
        });
        toCreate.forEach((expense) => {
          expense.isSynced = true;
          expense.isCreatedLocally = false;
        });
        toDelete.forEach((expense) => {
          expense.isSynced = true;
        });
        removeExpensesLocally(locallyDeleted.map((expense) => expense.id));

        saveExpensesToStorage();
      } catch (error) {
        syncError.value = "Не удалось синхронизировать расходы";
        throw error;
      }
    });
  });

  async function refreshExpenses() {
    const userId = authStore.userId;
    if (!userId || authStore.isAnonymous) {
      return;
    }

    await loadExpensesFromStorage();
    try {
      await syncExpenses();
      await loadExpensesFromApi();
    } catch (error) {
      console.error("Failed to refresh expenses:", error);
    }
  }

  async function loadExpensesFromApi() {
    sequentialExpenseOperation.all(async () => {
      const apiExpenses = await expenseApi.getExpenses();
      const apiExpensesIds = new Set(apiExpenses.map((expense) => expense.id));

      expenses.value = expenses.value.filter(
        (expense) => !expense.isSynced || apiExpensesIds.has(expense.id),
      );

      const localExpenseById = new Map(
        expenses.value.map((expense) => [expense.id, expense]),
      );

      apiExpenses.forEach((apiExpense) => {
        const local = localExpenseById.get(apiExpense.id);
        if (local && !local.isSynced) {
          const mapped = parseApiExpense(apiExpense);
          if (local) {
            Object.assign(local, mapped); // refresh expense state in case it was modified from other device
          } else {
            expenses.value.push(mapped);
          }
        }
      });

      saveExpensesToStorage();
    });
  }

  function getNotSyncedExpenses() {
    if (loadedUserId !== authStore.userId) {
      return [];
    }

    return expenses.value.filter((expense) => !expense.isSynced);
  }

  function getNotSyncedExpensesCount() {
    return getNotSyncedExpenses().length;
  }

  function splitPendingExpenses(
    pendingExpenses: Expense[],
    apiExpenses: ApiResponseExpenseDto[],
  ): SplitPendingExpensesResult {
    const apiById = new Map(
      apiExpenses.map((expense) => [expense.id, expense]),
    );

    return {
      toCreate: pendingExpenses.filter((expense) => {
        return !expense.deletedAt && !apiById.has(expense.id);
      }),
      toUpdate: pendingExpenses.filter((expense) => {
        const apiExpense = apiById.get(expense.id);
        return !expense.deletedAt && !!apiExpense && !apiExpense.deletedAt;
      }),
      toDelete: pendingExpenses.filter((expense) => {
        const apiExpense = apiById.get(expense.id);
        return !!expense.deletedAt && !!apiExpense && !apiExpense.deletedAt;
      }),
      locallyDeleted: pendingExpenses.filter((expense) => {
        return (
          !!expense.deletedAt &&
          expense.isCreatedLocally &&
          !apiById.has(expense.id)
        );
      }),
    };
  }

  function removeExpensesLocally(expenseIds: string[]) {
    if (expenseIds.length === 0) {
      return;
    }

    const ids = new Set(expenseIds);
    expenses.value = expenses.value.filter((expense) => !ids.has(expense.id));
  }

  function hasNotSyncedExpensesExcept(expenseId: string) {
    return getNotSyncedExpenses().some((expense) => expense.id !== expenseId);
  }

  function createExpense(payload: CreateExpensePayload): string {
    const expense = createExpenseLocally(payload);

    if (getNotSyncedExpenses().length > 0) {
      void syncExpenses().catch((error) => {
        console.error("Failed to sync expenses:", error);
      });
    } else {
      void createExpenseOnApi(expense).catch((error) =>
        console.error("Failed to create expense:", error),
      );
    }
    return expense.id;
  }

  function createExpenseLocally(payload: CreateExpensePayload): Expense {
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: payload.amount,
      categoryId: payload.categoryId,
      customCategoryId: payload.customCategoryId,
      createdAt: new Date().toISOString(),
      description: payload.description,
      paymentDate: payload.paymentDate,
      isSynced: false,
      isCreatedLocally: true,
    };

    expenses.value.push(expense);
    saveExpensesToStorage();
    return expense;
  }

  async function createExpenseOnApi(expense: Expense) {
    await sequentialExpenseOperation.byKey(expense.id, async () => {
      await expenseApi.createExpense(mapExpenseToCreateDto(expense));
      expense.isCreatedLocally = false;
      expense.isSynced = true;
      saveExpensesToStorage();
    });
  }

  function updateExpense(payload: ExpenseUpdatePayload) {
    const expense = updateExpenseLocally(payload);

    if (hasNotSyncedExpensesExcept(payload.id)) {
      void syncExpenses().catch((error) => {
        console.error("Failed to sync expenses:", error);
      });
    } else {
      void updateExpenseOnApi(expense).catch((error) =>
        console.error("Failed to update expense:", error),
      );
    }
  }

  function updateExpenseLocally(payload: ExpenseUpdatePayload): Expense {
    const expenseId = payload.id;

    const index = expenses.value.findIndex(
      (expense) => expense.id === expenseId,
    );
    if (index === -1) {
      throw Error("Expense to update was not found locally");
    }

    expenses.value[index] = {
      ...expenses.value[index]!,
      ...payload,
      isSynced: false,
    };
    saveExpensesToStorage();

    return expenses.value[index];
  }

  async function updateExpenseOnApi(expense: Expense) {
    await sequentialExpenseOperation.byKey(expense.id, async () => {
      if (expense.isCreatedLocally) {
        await expenseApi.createExpense(mapExpenseToCreateDto(expense));
        expense.isCreatedLocally = false;
      } else {
        await expenseApi.updateExpense(
          expense.id,
          mapExpenseToUpdateDto(expense),
        );
      }
      expense.isSynced = true;
      saveExpensesToStorage();
    });
  }

  function deleteExpense(expenseId: string) {
    const expense = deleteExpenseLocally(expenseId);
    if (expense === undefined) return;

    if (hasNotSyncedExpensesExcept(expenseId)) {
      void syncExpenses().catch((error) => {
        console.error("Failed to sync expenses:", error);
      });
    } else {
      void deleteExpenseOnApi(expense).catch((error) =>
        console.error("Failed to delete expense:", error),
      );
    }
  }

  /**
   * @returns
   *  Expense - if expense is marked as deleted locally to sync deletion with API later.
   *  undefined - if expense was created only locally or if expense was not found locally
   */
  function deleteExpenseLocally(expenseId: string): Expense | undefined {
    const expense = expenses.value.find((expense) => expense.id === expenseId);

    if (!expense) {
      return undefined;
    }

    if (expense.isCreatedLocally) {
      removeExpensesLocally([expenseId]);
      saveExpensesToStorage();
      return undefined;
    }

    expense.deletedAt = new Date().toISOString();
    expense.isSynced = false;
    saveExpensesToStorage();
    return expense;
  }

  async function deleteExpenseOnApi(expense: Expense) {
    await sequentialExpenseOperation.byKey(expense.id, async () => {
      await expenseApi.deleteExpense(expense.id);
      expense.deletedAt = expense.deletedAt ?? new Date().toISOString();
      expense.isSynced = true;
      saveExpensesToStorage();
    });
  }

  function getExpenseById(id: string) {
    return expenses.value.find((expense) => expense.id === id);
  }

  async function transferAnonymousExpenses() {
    if (!authStore.userId || authStore.isAnonymous) {
      return 0;
    }

    const anonymousProfile = localStorage.getItem("finfast-anonymous-profile");
    if (!anonymousProfile) {
      return 0;
    }

    const anonymousUserId = `anonymous:${anonymousProfile}`;
    const anonymousExpenses =
      await expenseStorage.loadExpenses(anonymousUserId);
    if (anonymousExpenses.length === 0) {
      return 0;
    }

    const currentExpenses = await expenseStorage.loadExpenses(authStore.userId);
    const existingIds = new Set(currentExpenses.map((expense) => expense.id));
    const transferredExpenses = anonymousExpenses.filter(
      (expense) => !existingIds.has(expense.id),
    );
    await expenseStorage.saveExpenses(authStore.userId, [
      ...currentExpenses,
      ...transferredExpenses,
    ]);
    await loadExpensesFromStorage();
    await syncExpenses();
    await expenseStorage.saveExpenses(anonymousUserId, []);
    localStorage.removeItem("finfast-anonymous-profile");
    return transferredExpenses.length;
  }

  function initializeOnlineSync() {
    const sync = () => {
      if (
        navigator.onLine &&
        authStore.isAuthenticated &&
        !authStore.isAnonymous
      ) {
        void refreshExpenses().catch((error) =>
          console.error("Failed to sync expenses:", error),
        );
      }
    };
    window.addEventListener("online", sync);
    sync();

    onScopeDispose(() => {
      window.removeEventListener("online", sync);
    });
  }

  initializeOnlineSync();

  return {
    expenses,
    syncError,
    loadExpensesFromStorage,
    clearCurrentUserExpenses,
    refreshExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getNotSyncedExpensesCount,
    transferAnonymousExpenses,
  };
});
