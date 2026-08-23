<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExpenseAmountInput from '@/components/ExpenseAmountInput.vue'
import {
  useExpenseStore,
  type ExpensePayload
} from '@/stores/expense'
import ExpenseCategorySelectionView from '@/views/ExpenseCategorySelectionView.vue'

const router = useRouter()
const route = useRoute()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const expenseStore = useExpenseStore()

const isEditing = computed(() => route.query.id !== undefined)

const initialAmount = ref<number | undefined>(
  route.query.amount ? Number(route.query.amount) : undefined
)

async function handleSubmit(amount: number) {
  if (isEditing.value) {
    const expenseId = route.query.id as string
    const categoryId = route.query.categoryId as string | undefined

    await expenseStore.updateExpenseAmount(expenseId, amount)

    // Preserve the category when editing amount
    if (categoryId !== undefined) {
      await expenseStore.updateExpenseCategory(expenseId, categoryId)
    }

    router.push({
      name: "expense-history"
    })
  } else {
    const payload: ExpensePayload = {
      amount
    }
    const newExpenseId = await expenseStore.addExpense(payload)

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
      <ExpenseAmountInput :expenseId="route.query.id as string | undefined" :amount="initialAmount" :editing="isEditing" @submit="handleSubmit"
        @cancel="handleCancel" />
    </v-container>
  </v-main>
</template>

<style scoped>
</style>