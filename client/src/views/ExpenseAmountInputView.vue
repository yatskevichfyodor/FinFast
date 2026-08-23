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
      name: "ExpenseHistoryView",
      params: { expenseId: props.id }
    })
  } else {
    const newExpenseId = expenseStore.addExpense(payload)

    router.push({
      name: "ExpenseCategorySelectionView",
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
</style>