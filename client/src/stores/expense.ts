import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Expense {
  id: string
  amount: number
  categoryId?: string
  createdAt: string
}

export interface ExpensePayload {
  id?: string
  amount: number
  categoryId?: number
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
      expenses.value = JSON.parse(savedExpenses)
    } catch {
      expenses.value = []
    }
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
      createdAt: new Date().toISOString()
    }

    expenses.value.push(expense)
    saveExpenses()
    return newExpenseId;
  }

  function updateExpense(payload: ExpensePayload) {
    if (payload.id === undefined) {
      return
    }

    const index = expenses.value.findIndex(
      expense => expense.id === payload.id
    )

    if (index === -1) {
      return
    }

    expenses.value[index] = {
      ...expenses.value[index]!,
      amount: payload.amount,
      categoryId: payload.categoryId
    }

    saveExpenses()
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

    saveExpenses()
  }

  function deleteExpense(id: string) {
    expenses.value = expenses.value.filter(
      expense => expense.id !== id
    )

    saveExpenses()
  }

  function getExpenseById(id: string) {
    return expenses.value.find(
      expense => expense.id === id
    )
  }

  return {
    expenses,
    loadExpenses,
    addExpense,
    updateExpense,
    updateExpenseCategory,
    deleteExpense,
    getExpenseById
  }
})