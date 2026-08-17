<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import ExpenseInput from '@/components/ExpenseInput.vue'
import ExpensesHistory from './ExpensesHistory.vue'

type View = 'add-expense' | 'monthly-expenses'

interface Expense {
  id: number
  amount: number
  categoryId?: number
  createdAt: string
}

const theme = useTheme()
const currentView = ref<View>('add-expense')
const editingExpenseId = ref<number | null>(null)
const expenses = ref<Expense[]>([])
let expenseIdCounter = 1

const editingExpense = computed(() => {
  if (editingExpenseId.value === null) {
    return undefined
  }

  return expenses.value.find(expense => expense.id === editingExpenseId.value)
})

onMounted(() => {
  const savedExpenses = localStorage.getItem('finfast-expenses')
  if (savedExpenses) {
    expenses.value = JSON.parse(savedExpenses)
    if (expenses.value.length > 0) {
      expenseIdCounter = Math.max(...expenses.value.map(e => e.id)) + 1
    }
  }

  const savedTheme = localStorage.getItem('finfast-theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
  }
})

watch(expenses, (newExpenses) => {
  localStorage.setItem('finfast-expenses', JSON.stringify(newExpenses))
}, { deep: true })

watch(() => theme.global.name.value, (newTheme) => {
  localStorage.setItem('finfast-theme', newTheme)
})

function handleExpenseSubmit(payload: { id?: number; amount: number; categoryId?: number }) {
  if (payload.id !== undefined) {
    const index = expenses.value.findIndex(expense => expense.id === payload.id)

    if (index !== -1) {
      expenses.value[index] = {
        ...expenses.value[index]!,
        amount: payload.amount,
        categoryId: payload.categoryId
      }
    }
  } else {
    const expense: Expense = {
      id: expenseIdCounter++,
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdAt: new Date().toISOString()
    }

    expenses.value.push(expense)
  }

  editingExpenseId.value = null
  currentView.value = 'monthly-expenses'
}

function goToAddExpense() {
  editingExpenseId.value = null
  currentView.value = 'add-expense'
}

function handleEditExpense(expense: Expense) {
  editingExpenseId.value = expense.id
  currentView.value = 'add-expense'
}

function handleEditCancel() {
  editingExpenseId.value = null
  currentView.value = 'monthly-expenses'
}

function handleDeleteExpense(id: number) {
  expenses.value = expenses.value.filter(expense => expense.id !== id)
}
</script>

<template>
  <v-main class="app-background">
    <v-container
      class="expense-page"
      max-width="600"
    >
      <v-fade-transition mode="out-in">
        <ExpenseInput
          v-if="currentView === 'add-expense'"
          :key="editingExpenseId ?? 'new'"
          :expense="editingExpense"
          @submit="handleExpenseSubmit"
          @cancel="handleEditCancel"
        />

        <ExpensesHistory
          v-else
          key="monthly-expenses"
          :expenses="expenses"
          @add-expense="goToAddExpense"
          @edit-expense="handleEditExpense"
          @delete-expense="handleDeleteExpense"
        />
      </v-fade-transition>
    </v-container>
  </v-main>
</template>

<style scoped>
.app-background {
  min-height: 100vh;
  background: #f6f8fb;
  transition: background-color 0.3s ease;
}

.v-theme--dark .app-background {
  background: #121212;
}

.expense-page {
  min-height: 100vh;
  padding-top: 32px;
  padding-bottom: 40px;
}

@media (max-width: 600px) {
  .expense-page {
    padding: 20px 16px 32px;
  }
}
</style>
