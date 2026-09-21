<script setup lang="ts">
import { computed, ref } from 'vue'
import { CATEGORIES, type Category } from '@/constants/categories'
import { buildPopularCategoryOrder } from '@/services/categoryPopularity'
import { useExpenseStore } from '@/stores/expense'

const props = defineProps<{
  selectedCategoryId: string | null
}>()

const emit = defineEmits<{
  'update:selectedCategoryId': [value: string | null]
}>()

const expenseStore = useExpenseStore()
const orderedCategories = ref<Category[]>(buildPopularCategoryOrder(expenseStore.expenses))

const displayedCategories = computed(() => orderedCategories.value)

function selectCategory(categoryId: string) {
  const nextCategoryId = props.selectedCategoryId === categoryId ? null : categoryId
  emit('update:selectedCategoryId', nextCategoryId)
}
</script>

<template>
  <div class="category-picker">
    <div class="category-scroll-hint category-scroll-hint--left" aria-hidden="true">
      <v-icon icon="mdi-chevron-left" size="16" />
    </div>

    <div class="category-scroll-hint category-scroll-hint--right" aria-hidden="true">
      <v-icon icon="mdi-chevron-right" size="16" />
    </div>

    <div class="category-scroll">
      <div class="category-row">
        <v-card
          v-for="category in displayedCategories"
          :key="category.id"
          class="category-card"
          :class="{ selected: selectedCategoryId === category.id }"
          :style="{ '--category-color': category.color }"
          rounded="xl"
          elevation="0"
          @click="selectCategory(category.id)"
        >
          <v-card-text class="category-content">
            <div
              class="category-icon"
              :class="{ selected: selectedCategoryId === category.id }"
              :style="{ '--category-color': category.color }"
            >
              <v-icon :icon="category.icon" size="26" />
            </div>

            <div class="category-name">
              {{ category.name }}
            </div>

            <v-icon
              v-if="selectedCategoryId === category.id"
              icon="mdi-check-circle"
              class="check-icon"
              size="18"
            />
          </v-card-text>
        </v-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-picker {
  position: relative;
  width: 100%;
  max-width: 100%;
}

.category-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 18px 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 10px;
  min-width: max-content;
}

.category-card {
  position: relative;
  flex: 0 0 118px;
  min-width: 118px;
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
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.category-card.selected {
  border-color: var(--category-color);
  box-shadow: 0 5px 15px color-mix(in srgb, var(--category-color) 18%, transparent);
}

.category-content {
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px !important;
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
  background: color-mix(in srgb, var(--category-color) 10%, white);
  transition: background 0.18s ease, color 0.18s ease;
}

.category-icon.selected {
  color: white;
  background: var(--category-color);
}

.category-name {
  font-size: 12px;
  line-height: 1.2;
  font-weight: 600;
  text-align: center;
  color: #455a64;
  word-break: break-word;
}

.check-icon {
  position: absolute;
  top: 7px;
  right: 7px;
  color: var(--category-color);
}

.category-scroll-hint {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 56px;
  border-radius: 999px;
  color: rgba(0, 0, 0, 0.45);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.45));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  pointer-events: none;
}

.category-scroll-hint--left {
  left: 0;
}

.category-scroll-hint--right {
  right: 0;
  background: linear-gradient(270deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.45));
}

@media (min-width: 961px) {
  .category-picker {
    max-width: 440px;
    margin: 0 auto;
  }

  .category-scroll {
    overflow: visible;
    padding: 6px 0 8px;
  }

  .category-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
    width: 100%;
  }

  .category-card {
    flex: 1 1 0;
    min-width: 0;
    width: 100%;
  }

  .category-scroll-hint {
    display: none;
  }
}
</style>