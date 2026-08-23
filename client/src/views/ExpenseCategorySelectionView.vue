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

const isEditing = computed(() => exprenseId !== undefined)

function navigateToHistory() {
  router.push({ name: 'expense-history' })
}

function handleCategoryChange(categoryId: string | null) {
  if (exprenseId === undefined) {
    return
  }

  expenseStore.updateExpenseCategory(
    exprenseId,
    categoryId ?? undefined
  )

  emit('done')
  navigateToHistory()
}

function skipCategory() {
  if (exprenseId === undefined) {
    return
  }

  expenseStore.updateExpenseCategory(
    exprenseId,
    undefined
  )

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

    </v-container>
  </v-main>
</template>

<style scoped>
</style>