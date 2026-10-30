import { toRaw } from "vue";
import type { Expense } from "@/types/expense";
import { DEFAULT_CURRENCY } from "@/types/currency";
import { openDatabase } from "./indexedDB";
import { EXPENSES_STORE_NAME } from "./indexedDB";

interface ExpenseRecord {
  userId: string;
  expenseId: string;
  expense: Expense;
}

export const expenseStorage = {
  async loadExpenses(userId: string): Promise<Expense[]> {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(EXPENSES_STORE_NAME, "readwrite");
      const range = IDBKeyRange.bound([userId, ""], [userId, "\uffff"]);
      const request = transaction
        .objectStore(EXPENSES_STORE_NAME)
        .getAll(range) as IDBRequest<ExpenseRecord[]>;

      request.onsuccess = () => {
        const expenses = request.result.map((record) => {
          if (!record.expense.currency) {
            record.expense.currency = DEFAULT_CURRENCY;
            transaction.objectStore(EXPENSES_STORE_NAME).put(record);
          }
          return record.expense;
        });
        resolve(expenses);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to load expenses"));
      };
    });
  },

  async saveExpenses(userId: string, expenses: Expense[]): Promise<void> {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(EXPENSES_STORE_NAME, "readwrite");
      const objectStore = transaction.objectStore(EXPENSES_STORE_NAME);
      const range = IDBKeyRange.bound([userId, ""], [userId, "\uffff"]);
      const existingRequest = objectStore.getAll(range) as IDBRequest<
        ExpenseRecord[]
      >;

      existingRequest.onsuccess = () => {
        const expensesIds = expenses.map(it => it.id);

        existingRequest.result.forEach((record) => {
          if (!expensesIds.includes(record.expenseId)) {
            objectStore.delete([userId, record.expenseId]);
          }
        });

        expenses.forEach((expense) => {
          objectStore.put({
            userId,
            expenseId: expense.id,
            expense: toRaw(expense),
          } satisfies ExpenseRecord);
        });
      };
      existingRequest.onerror = () => {
        transaction.abort();
      };

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Failed to save expenses"));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error("Failed to save expenses"));
      };
    });
  },

  async deleteExpenses(userId: string): Promise<void> {
    await this.saveExpenses(userId, []);
  },
};
