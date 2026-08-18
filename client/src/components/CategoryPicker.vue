<script setup lang="ts">
import { CATEGORIES, type Category } from '@/constants/categories'

defineProps<{
  selectedCategoryId: string | null
}>()

const emit = defineEmits<{
  'update:selectedCategoryId': [value: string | null]
}>()

function selectCategory(categoryId: string) {
  if (categoryId === undefined) {
    emit('update:selectedCategoryId', null)
    return
  }

  emit(
    'update:selectedCategoryId',
    categoryId
  )
}
</script>

<template>
  <div>
    <v-row dense class="mt-2">
      <v-col v-for="category in CATEGORIES" :key="category.id" cols="3">
        <v-card class="category-card" :class="{
          selected: selectedCategoryId === category.id
        }" :style="{
          '--category-color': category.color
        }" rounded="xl" elevation="0" @click="selectCategory(category.id)">
          <v-card-text class="category-content">

            <div class="category-icon" :class="{
              selected: selectedCategoryId === category.id
            }" :style="{
              '--category-color': category.color
            }">
              <v-icon :icon="category.icon" size="26" />
            </div>

            <div class="category-name">
              {{ category.name }}
            </div>

            <v-icon v-if="selectedCategoryId === category.id" icon="mdi-check-circle" class="check-icon" size="18" />

          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-card {
  position: relative;
  cursor: pointer;

  background: #ffffff;

  border: 2px solid #edf0f3;

  transition:
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.category-card:hover {
  transform: translateY(-2px);

  border-color: #d5dce2;

  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.06);
}

.category-card.selected {
  border-color: var(--category-color);

  box-shadow:
    0 5px 15px color-mix(in srgb,
      var(--category-color) 18%,
      transparent);
}

.category-content {
  min-height: 105px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding: 12px 6px !important;
}

.category-icon {
  width: 46px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-bottom: 7px;

  border-radius: 14px;

  color: var(--category-color);

  background: color-mix(in srgb,
      var(--category-color) 10%,
      white);

  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.category-icon.selected {
  color: white;

  background: var(--category-color);
}

.category-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #455a64;
}

.check-icon {
  position: absolute;
  top: 7px;
  right: 7px;

  color: var(--category-color);
}
</style>