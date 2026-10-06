import { createPinia } from 'pinia'
import { shallowRef } from 'vue';
import { createExpenseStore, type ExpenseStore } from './expenseStore';
import { createDataChangesStore, type DataChangesStore } from './dataChangesStore';
import { createCategoryStore, type CategoryStore } from './categoryStore';
import { createCategoryOrderStore, type CategoryOrderStore } from './categoryOrderStore';

export const pinia = createPinia()

const dataChangesStore = shallowRef<DataChangesStore | null>(null);
const categoryStore = shallowRef<CategoryStore | null>(null);
const expenseStore = shallowRef<ExpenseStore | null>(null);
const categoryOrderStore = shallowRef<CategoryOrderStore | null>(null);


export function setDataChangesStore(userId: string | null) {
    dataChangesStore.value =
        userId
            ? createDataChangesStore(userId)
            : null;
}

export function useDataChangesStore() {
  return dataChangesStore
}


export function setCategoryStore(userId: string | null) {
    categoryStore.value =
        userId
            ? createCategoryStore(userId)
            : null;
}

export function useCategoryStore() {
  return categoryStore
}


export function setExpenseStore(userId: string | null) {
    expenseStore.value =
        userId
            ? createExpenseStore(userId)
            : null;
}

export function useExpenseStore() {
  return expenseStore
}


export function setCategoryOrderStore(userId: string | null) {
    categoryOrderStore.value =
        userId
            ? createCategoryOrderStore(userId)
            : null;
}

export function useCategoryOrderStore() {
  return categoryOrderStore
}