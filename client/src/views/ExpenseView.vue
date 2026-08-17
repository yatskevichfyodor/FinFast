<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import ExpenseInput from '@/components/ExpenseInput.vue'
import MonthlyExpensesView from './MonthlyExpensesView.vue'

type View = 'add-expense' | 'monthly-expenses'

interface Expense {
  id: number
  amount: number
  categoryId?: number
  createdAt: string
}

const theme = useTheme()
const currentView = ref<View>('add-expense')
const expenses = ref<Expense[]>([])
let expenseIdCounter = 1

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

function handleExpenseSubmit(payload: { amount: number; categoryId?: number }) {
  const expense: Expense = {
    id: expenseIdCounter++,
    amount: payload.amount,
    categoryId: payload.categoryId,
    createdAt: new Date().toISOString()
  }

  expenses.value.push(expense)
  currentView.value = 'monthly-expenses'
}

function goToAddExpense() {
  currentView.value = 'add-expense'
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
          key="add-expense"
          @submit="handleExpenseSubmit"
        />

        <MonthlyExpensesView
          v-else
          key="monthly-expenses"
          :expenses="expenses"
          @add-expense="goToAddExpense"
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
