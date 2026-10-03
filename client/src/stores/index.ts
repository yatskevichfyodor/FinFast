import { createPinia } from 'pinia'
import { shallowRef } from 'vue';
import { createExpenseStore, type ExpenseStore } from './expenseStore';
import { createDataChangesStore, type DataChangesStore } from './dataChangesStore';

export const pinia = createPinia()

const dataChangesStore = shallowRef<DataChangesStore | null>(null);
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

export function setDataChangesStore(userId: string | null) {
    dataChangesStore.value =
        userId
            ? createDataChangesStore(userId)
            : null;
}

export function useDataChangesStore() {
  return dataChangesStore
}
