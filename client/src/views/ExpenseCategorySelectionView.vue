<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import CategoryPicker from '@/components/CategoryPicker.vue'
import type { Category } from '@/constants/categories'

import { useExpenseStore } from '@/stores/expense'

const router = useRouter()
const exprenseId = history.state.expenseId

const props = defineProps<{
  expenseCategory?: Category
}>()

const emit = defineEmits<{
  done: []
}>()

const expenseStore = useExpenseStore()

const selectedCategoryId = ref<string | null>(
  props.expenseCategory?.id ?? null
)

const description = ref('')
const paymentDate = ref<string | null>(null)

const isEditing = computed(() => history.state.isEditing === true)

function navigateToHistory() {
  router.push({ name: 'expense-history' })
}

function handleCategoryChange(categoryId: string | null) {
  expenseStore.updateExpenseCategory(
    exprenseId,
    categoryId ?? undefined
  )

  // Update description and payment date
  const expense = expenseStore.getExpenseById(exprenseId)
  if (expense) {
    expense.description = description.value || undefined
    expense.paymentDate = paymentDate.value || undefined
    expenseStore.persistExpenses()
  }

  emit('done')
  navigateToHistory()
}

function skipCategory() {
  expenseStore.updateExpenseCategory(
    exprenseId,
    undefined
  )

  // Update description and payment date even when skipping category
  const expense = expenseStore.getExpenseById(exprenseId)
  if (expense) {
    expense.description = description.value || undefined
    expense.paymentDate = paymentDate.value || undefined
    expenseStore.persistExpenses()
  }

  emit('done')
  navigateToHistory()
}

watch(selectedCategoryId, (newCategoryId) => {
  if (newCategoryId !== null) {
    handleCategoryChange(newCategoryId)
  }
})
</script>

<template>
  <v-main class="app-background">
    <v-container class="expense-page" max-width="600">

      <div class="mb-6">
        <div class="d-flex align-center">
          <div class="text-h5 font-weight-bold">
            {{ isEditing ? 'Изменение категории' : 'Категория расхода' }}
          </div>

          <v-spacer />

          <v-btn
            v-if="!isEditing"
            variant="text"
            color="primary"
            @click="skipCategory"
          >
            Пропустить
          </v-btn>
        </div>

        <div class="text-body-2 text-medium-emphasis mt-1">
          Выберите категорию расхода
        </div>
      </div>

      <CategoryPicker
        v-model:selectedCategoryId="selectedCategoryId"
      />

      <v-card
        rounded="xl"
        elevation="0"
        class="mt-5"
      >
        <v-card-text>
          <v-text-field
            v-model="description"
            label="Описание (что куплено)"
            placeholder="Например: продукты, обед, бензин"
            variant="outlined"
            density="comfortable"
            clearable
          />

          <v-text-field
            v-model="paymentDate"
            label="Дата платежа"
            type="datetime-local"
            variant="outlined"
            density="comfortable"
            clearable
            hint="Оставьте пустым для текущей даты"
            persistent-hint
          />
        </v-card-text>
      </v-card>

    </v-container>
  </v-main>
</template>

<style scoped>
</style>