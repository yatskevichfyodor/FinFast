<script setup lang="ts">
import { computed, ref } from 'vue'

import ExpenseAmountInput from '@/components/ExpenseAmountInput.vue'
import {
  useExpenseStore,
  type ExpensePayload
} from '@/stores/expense'
import ExpenseCategorySelectionView from '@/views/ExpenseCategorySelectionView.vue'

import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  id?: string,
  amount?: number
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const expenseStore = useExpenseStore()

const isEditing = computed(() => props.id !== undefined)

const initialAmount = ref<number | undefined>(props.amount)

function handleSubmit(amount: number) {
  const payload: ExpensePayload = {
    amount,
    ...(props.id !== undefined && {
      id: props.id
    })
  }

  if (isEditing.value) {
    expenseStore.updateExpense(payload)
    router.push({
      name: "ExpenseHistory",
      params: { expenseId: props.id }
    })
  } else {
    const newExpenseId = expenseStore.addExpense(payload)

    router.push({
      name: ExpenseCategorySelectionView.name,
      state: { expenseId: newExpenseId }
    })
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <v-main class="app-background">
    <v-container class="expense-page" max-width="600">
      <ExpenseAmountInput :expenseId="undefined" :amount="initialAmount" :editing="isEditing" @submit="handleSubmit"
        @cancel="handleCancel" />
    </v-container>
  </v-main>
</template>

<style scoped>
.app-background {
  min-height: 100vh;
  background: #f6f8fb;
  transition: background-color 0.3s ease;
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