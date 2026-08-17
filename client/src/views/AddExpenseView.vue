<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'

import ExpenseInput from '@/components/ExpenseInput.vue'
import ExpensesHistory from '@/views/ExpensesHistory.vue'
import {
  useExpenseStore,
  type Expense,
  type ExpensePayload
} from '@/stores/expense'

type View = 'add-expense' | 'monthly-expenses'

const theme = useTheme()
const expenseStore = useExpenseStore()

const currentView = ref<View>('add-expense')
const editingExpenseId = ref<number | null>(null)

const editingExpense = computed<Expense | undefined>(() => {
  if (editingExpenseId.value === null) {
    return undefined
  }

  return expenseStore.getExpenseById(editingExpenseId.value)
})

onMounted(() => {
  expenseStore.loadExpenses()

  const savedTheme = localStorage.getItem('finfast-theme')

  if (savedTheme) {
    theme.global.name.value = savedTheme
  }
})

function handleExpenseSubmit(payload: ExpensePayload) {
  if (payload.id !== undefined) {
    expenseStore.updateExpense(payload)
  } else {
    expenseStore.addExpense(payload)
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
          @add-expense="goToAddExpense"
          @edit-expense="handleEditExpense"
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