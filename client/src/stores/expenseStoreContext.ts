import { shallowRef } from "vue";
import {
    createExpenseStore,
    type ExpenseStore,
} from "./expenseStore";

const expenseStore = shallowRef<ExpenseStore | null>(null);

export function setExpenseStore(userId: string | null) {
    expenseStore.value =
        userId
            ? createExpenseStore(userId)
            : null;
}

export function useExpenseStore() {
  return expenseStore
}