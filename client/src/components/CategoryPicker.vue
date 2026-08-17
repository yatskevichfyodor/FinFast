<script setup lang="ts">
import type { Category } from '../types/expense'

defineProps<{
  categories: Category[]
  modelValue?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

function selectCategory(id: number) {
  emit('update:modelValue', id)
}
</script>

<template>
  <div class="categories">
    <button
      v-for="category in categories"
      :key="category.id"
      class="category"
      :class="{ selected: modelValue === category.id }"
      @click="selectCategory(category.id)"
    >
      <span class="category-icon">{{ category.icon }}</span>
      <span>{{ category.name }}</span>
    </button>
  </div>
</template>