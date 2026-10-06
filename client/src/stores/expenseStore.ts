import { onScopeDispose, reactive, ref } from "vue";
import { expenseApi } from "@/services/api/expenseApi";
import { expenseStorage } from "@/storage/indexedDB";
import { ANONYMOUS_USER_ID, useAuthStore } from "@/stores/authStore";
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
import { pinia } from ".";

type SplitPendingExpensesResult = {
  toCreate: Expense[];
  toUpdate: Expense[];
  toDelete: Expense[];
};

export type ExpenseStore = ReturnType<typeof createExpenseStore>;

export function createExpenseStore(userId: string) {
  const authStore = useAuthStore(pinia);
  const sequentialExpenseOperation = createSequentialByKeys<string>();
  const { storeStateGuard, invalidateState } = createStoreStateGuard();

  const expenses = ref<Expense[]>([]);

  async function loadDataFromStorage() {
    expenses.value = [];

    await storeStateGuard(
      async () => await expenseStorage.loadExpenses(userId),
      (storedExpenses: Expense[]) => {
        expenses.value = storedExpenses;
      },
    );
  }

  async function saveExpensesToStorage() {
    return expenseStorage.saveExpenses(userId, expenses.value);
  }

  async function clearUserExpenses() {
    invalidateState();
    await expenseStorage.saveExpenses(userId, []);
  }

  /**
   * Send local data changes to the API.
   * Local data changes include:
   * - expense field change
   * - expense creation
   * - expense deletion
   */
  const syncExpensesChanges = createCoalescedOperation(async () => {
    if (userId === ANONYMOUS_USER_ID) {
      return;
    }

    const notSyncedExpenses = getNotSyncedExpenses();
    if (notSyncedExpenses.length === 0) {
      return;
    }

    const notSyncedExpensesIds = notSyncedExpenses.map((expense) => expense.id);

    await sequentialExpenseOperation.byKeys(notSyncedExpensesIds, async () => {
      try {
        const apiExpenses =
          await expenseApi.getExpensesByIds(notSyncedExpensesIds);

        const { toCreate, toUpdate, toDelete } = splitNotSyncedExpenses(
          notSyncedExpenses,
          apiExpenses,
        );

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

        await saveExpensesToStorage();
      } catch (error) {
        console.error("Couldn't sync expenses");
        throw error;
      }
    });
  });

  async function refreshExpenses() {
    await loadDataFromStorage();
    if (!authStore.isOffline) {
      try {
        await syncExpensesChanges();
        await loadExpensesFromApi();
      } catch (error) {
        console.error("Failed to refresh expenses:", error);
      }
    }
  }

  async function loadExpensesFromApi() {
    await sequentialExpenseOperation.all(async () => {
      const apiExpenses = await expenseApi.getExpenses();
      const apiExpensesIds = new Set(apiExpenses.map((expense) => expense.id));

      expenses.value = expenses.value.filter(
        (expense) => !expense.isSynced || apiExpensesIds.has(expense.id),
      );

      const localExpensesById = new Map(
        expenses.value.map((expense) => [expense.id, expense]),
      );

      const expensesToDeleteLocallyIds = new Set();
      apiExpenses.forEach((apiExpense) => {
        const local = localExpensesById.get(apiExpense.id);
        const mapped = parseApiExpense(apiExpense);
        if (!local) {
          if (!mapped.deletedAt) {
            expenses.value.push(mapped);
          }
          return;
        }

        if (mapped.deletedAt) {
          expensesToDeleteLocallyIds.add(mapped.id);
          return;
        }

        if (local.isSynced) {
          Object.assign(local, mapped);
        }
      });
      expenses.value = expenses.value.filter(it => !expensesToDeleteLocallyIds.has(it.id));

      await saveExpensesToStorage();
    });
  }

  function getNotSyncedExpenses() {
    return expenses.value.filter((expense) => !expense.isSynced);
  }

  function getNotSyncedExpensesCount() {
    return getNotSyncedExpenses().length;
  }

  function splitNotSyncedExpenses(
    notSyncedExpenses: Expense[], // local not synced expenses
    apiExpenses: ApiResponseExpenseDto[], // their current api version
  ): SplitPendingExpensesResult {
    const apiExpensesById = new Map(
      apiExpenses.map((expense) => [expense.id, expense]),
    );

    return {
      toCreate: notSyncedExpenses.filter((localExpense) => {
        return !localExpense.deletedAt && !apiExpensesById.has(localExpense.id);
      }),
      toUpdate: notSyncedExpenses.filter((localExpense) => {
        const apiExpense = apiExpensesById.get(localExpense.id);
        return !localExpense.deletedAt && !!apiExpense && !apiExpense.deletedAt;
      }),
      toDelete: notSyncedExpenses.filter((localExpense) => {
        const apiExpense = apiExpensesById.get(localExpense.id);
        return (
          !!localExpense.deletedAt && !!apiExpense && !apiExpense.deletedAt
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

  async function createExpense(payload: CreateExpensePayload): Promise<string> {
    const expense = await createExpenseLocally(payload);

    if (getNotSyncedExpenses().length > 0) {
      void syncExpensesChanges().catch((error) => {
        console.error("Failed to sync expenses:", error);
      });
    } else {
      void createExpenseOnApi(expense).catch((error) =>
        console.error("Failed to create expense:", error),
      );
    }
    return expense.id;
  }

  async function createExpenseLocally(
    payload: CreateExpensePayload,
  ): Promise<Expense> {
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
    await saveExpensesToStorage();
    return expense;
  }

  async function createExpenseOnApi(expense: Expense) {
    await sequentialExpenseOperation.byKey(expense.id, async () => {
      await expenseApi.createExpense(mapExpenseToCreateDto(expense));
      expense.isCreatedLocally = false;
      expense.isSynced = true;
      await saveExpensesToStorage();
    });
  }

  async function updateExpense(payload: ExpenseUpdatePayload) {
    const expense = await updateExpenseLocally(payload);

    if (hasNotSyncedExpensesExcept(payload.id)) {
      void syncExpensesChanges().catch((error) => {
        console.error("Failed to sync expenses:", error);
      });
    } else {
      void updateExpenseOnApi(expense).catch((error) =>
        console.error("Failed to update expense:", error),
      );
    }
  }

  async function updateExpenseLocally(
    payload: ExpenseUpdatePayload,
  ): Promise<Expense> {
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
    await saveExpensesToStorage();

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
      await saveExpensesToStorage();
    });
  }

  async function deleteExpense(expenseId: string) {
    const expense = await deleteExpenseLocally(expenseId);
    if (expense === undefined) return;

    if (hasNotSyncedExpensesExcept(expenseId)) {
      void syncExpensesChanges().catch((error) => {
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
  async function deleteExpenseLocally(
    expenseId: string,
  ): Promise<Expense | undefined> {
    const expense = expenses.value.find((expense) => expense.id === expenseId);

    if (!expense) {
      return undefined;
    }

    if (expense.isCreatedLocally) {
      removeExpensesLocally([expenseId]);
      await saveExpensesToStorage();
      return undefined;
    }

    expense.deletedAt = new Date().toISOString();
    expense.isSynced = false;
    await saveExpensesToStorage();
    return expense;
  }

  async function deleteExpenseOnApi(expense: Expense) {
    await sequentialExpenseOperation.byKey(expense.id, async () => {
      await expenseApi.deleteExpense(expense.id);
      expense.deletedAt = expense.deletedAt ?? new Date().toISOString();
      expense.isSynced = true;
      await saveExpensesToStorage();
    });
  }

  function getExpenseById(id: string) {
    return expenses.value.find((expense) => expense.id === id);
  }

  async function transferAnonymousExpenses(): Promise<void> {
    if (userId === ANONYMOUS_USER_ID) {
      return;
    }

    await sequentialExpenseOperation.all(async (): Promise<void> => {
      const anonymousExpenses =
        await expenseStorage.loadExpenses(ANONYMOUS_USER_ID);
      if (anonymousExpenses.length === 0) {
        return;
      }

      await loadDataFromStorage();
      const currentExpensesIds = new Set(
        expenses.value.map((expense) => expense.id),
      );

      const transferredExpenses = anonymousExpenses.filter(
        (expense) => !currentExpensesIds.has(expense.id),
      );

      if (transferredExpenses.length === 0) {
        await expenseStorage.saveExpenses(ANONYMOUS_USER_ID, []);
        return;
      }

      expenses.value.push(...transferredExpenses);
      await saveExpensesToStorage();
    });

    await syncExpensesChanges();
    await expenseStorage.saveExpenses(ANONYMOUS_USER_ID, []);
  }

  function initializeOnlineSync() {
    const sync = () => {
      if (
        navigator.onLine &&
        userId !== ANONYMOUS_USER_ID &&
        !authStore.isOffline
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

  return reactive({ // reactive helps to access expenses directly: expenseStore.expenses instead of expenseStore.expenses.value
    expenses,
    loadDataFromStorage,
    refreshExpenses,
    clearUserExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getNotSyncedExpensesCount,
    transferAnonymousExpenses,
  });
}
