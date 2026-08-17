<script setup lang="ts">
import { computed, ref } from 'vue'

import CategoryPicker, {
  type Category
} from '@/components/CategoryPicker.vue'

import { useExpenseStore } from '@/stores/expense'

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

function handleCategoryChange(categoryId: string | null) {
  selectedCategoryId.value = categoryId

  if (exprenseId === undefined) {
    return
  }

  expenseStore.updateExpenseCategory(
    exprenseId,
    categoryId ?? undefined
  )

  emit('done')
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
}
</script>

<template>
  <v-main class="app-background">
    <v-container class="expense-page" max-width="600">

      <div class="mb-6">
        <div class="text-h5 font-weight-bold">
          {{ isEditing ? 'Изменение категории' : 'Категория расхода' }}
        </div>

        <div class="text-body-2 text-medium-emphasis mt-1">
          Выберите категорию расхода
        </div>
      </div>

      <CategoryPicker
        v-model="selectedCategoryId"
      />

      <div class="d-flex justify-end mt-6">
        <v-btn
          variant="text"
          color="primary"
          @click="skipCategory"
        >
          Пропустить
        </v-btn>
      </div>

    </v-container>
  </v-main>
</template>

<style scoped>
.app-background {
  min-height: 100vh;
  background: #f6f8fb;
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