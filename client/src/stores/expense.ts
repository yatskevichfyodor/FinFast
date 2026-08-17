import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Expense {
  id: number
  amount: number
  categoryId?: number
  createdAt: string
}

export interface ExpensePayload {
  id?: number
  amount: number
  categoryId?: number
}

const STORAGE_KEY = 'finfast-expenses'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref<Expense[]>([])

  let nextId = 1

  function loadExpenses() {
    const savedExpenses = localStorage.getItem(STORAGE_KEY)

    if (!savedExpenses) {
      return
    }

    try {
      expenses.value = JSON.parse(savedExpenses)

      if (expenses.value.length > 0) {
        nextId =
          Math.max(...expenses.value.map(expense => expense.id)) + 1
      }
    } catch {
      expenses.value = []
      nextId = 1
    }
  }

  function saveExpenses() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(expenses.value)
    )
  }

  function addExpense(payload: ExpensePayload) {
    const expense: Expense = {
      id: nextId++,
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdAt: new Date().toISOString()
    }

    expenses.value.push(expense)
    saveExpenses()
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

  function deleteExpense(id: number) {
    expenses.value = expenses.value.filter(
      expense => expense.id !== id
    )

    saveExpenses()
  }

  function getExpenseById(id: number) {
    return expenses.value.find(
      expense => expense.id === id
    )
  }

  return {
    expenses,
    loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpenseById
  }
})