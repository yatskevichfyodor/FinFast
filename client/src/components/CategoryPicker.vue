<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { Category } from '@/types/category'
import { useCategoryStore } from '@/stores/category'

const props = defineProps<{
  selectedCategoryId: string | null
  selectedCustomCategoryId: string | null
}>()

const emit = defineEmits<{
  'update:selectedCategoryId': [value: string | null]
  'update:selectedCustomCategoryId': [value: string | null]
}>()

const categoryStore = useCategoryStore()

const displayedCategories = computed(() => categoryStore.availableCategories)

const scrollElement = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollHints() {
  const element = scrollElement.value

  if (!element) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const maxScrollLeft = element.scrollWidth - element.clientWidth

  canScrollLeft.value = element.scrollLeft > 1
  canScrollRight.value = element.scrollLeft < maxScrollLeft - 1
}

function selectCategory(category: Category) {
  const selected = category.system
    ? props.selectedCategoryId === category.id
    : props.selectedCustomCategoryId === category.id

  if (selected) {
    emit('update:selectedCategoryId', null)
    emit('update:selectedCustomCategoryId', null)
  } else if (category.system) {
    emit('update:selectedCategoryId', category.id)
    emit('update:selectedCustomCategoryId', null)
  } else {
    emit('update:selectedCategoryId', null)
    emit('update:selectedCustomCategoryId', category.id)
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()

  updateScrollHints()

  const element = scrollElement.value

  if (!element) {
    return
  }

  resizeObserver = new ResizeObserver(updateScrollHints)
  resizeObserver.observe(element)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(displayedCategories, async () => {
  await nextTick()
  updateScrollHints()
})
</script>

<template>
  <div class="category-picker">
    <div
      v-if="canScrollLeft"
      class="category-scroll-hint category-scroll-hint--left"
      aria-hidden="true"
    >
      <v-icon icon="mdi-chevron-left" size="18" />
    </div>

    <div
      v-if="canScrollRight"
      class="category-scroll-hint category-scroll-hint--right"
      aria-hidden="true"
    >
      <v-icon icon="mdi-chevron-right" size="18" />
    </div>

    <div
      ref="scrollElement"
      class="category-scroll"
      @scroll="updateScrollHints"
    >
      <div class="category-grid">
        <v-card
          v-for="category in displayedCategories"
          :key="category.id"
          class="category-card"
          :class="{
            selected:
              selectedCategoryId === category.id ||
              selectedCustomCategoryId === category.id
          }"
          :style="{ '--category-color': category.color }"
          rounded="xl"
          elevation="0"
          @click="selectCategory(category)"
        >
          <v-card-text class="category-content">
            <div
              class="category-icon"
              :class="{
                selected:
                  selectedCategoryId === category.id ||
                  selectedCustomCategoryId === category.id
              }"
              :style="{ '--category-color': category.color }"
            >
              <v-icon :icon="category.icon" size="26" />
            </div>

            <div class="category-name">
              {{ category.name }}
            </div>

            <v-icon
              v-if="
                selectedCategoryId === category.id ||
                selectedCustomCategoryId === category.id
              "
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
  min-width: 0;
}

.category-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  overflow-x: auto;
  overflow-y: hidden;

  padding: 6px 0 8px;

  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;

  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-grid {
  display: grid;

  grid-template-rows: repeat(2, 110px);
  grid-auto-flow: column;
  grid-auto-columns: 118px;

  gap: 10px;

  width: max-content;
}

.category-card {
  position: relative;
  width: 118px;
  min-width: 118px;
  cursor: pointer;

  background: #ffffff;
  border: 2px solid #edf0f3;

  scroll-snap-align: start;

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
  box-shadow:
    0 5px 15px color-mix(
      in srgb,
      var(--category-color) 18%,
      transparent
    );
}

.category-content {
  height: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding: 10px 8px !important;
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

  background: color-mix(
    in srgb,
    var(--category-color) 10%,
    white
  );

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
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 24px;
  height: 58px;

  transform: translateY(-50%);

  color: rgba(0, 0, 0, 0.5);

  pointer-events: none;
}

.category-scroll-hint--left {
  left: 0;

  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.98),
    rgba(255, 255, 255, 0)
  );
}

.category-scroll-hint--right {
  right: 0;

  background: linear-gradient(
    270deg,
    rgba(255, 255, 255, 0.98),
    rgba(255, 255, 255, 0)
  );
}

/*
 * На компьютере показываем стандартную полосу
 * горизонтальной прокрутки.
 */
@media (min-width: 961px) {
  .category-scroll {
    scrollbar-width: auto;
    -ms-overflow-style: auto;
  }

  .category-scroll::-webkit-scrollbar {
    display: block;
    height: 8px;
  }

  .category-scroll::-webkit-scrollbar-track {
    background: #f1f3f5;
    border-radius: 999px;
  }

  .category-scroll::-webkit-scrollbar-thumb {
    background: #c5cbd1;
    border-radius: 999px;
  }

  .category-scroll::-webkit-scrollbar-thumb:hover {
    background: #aeb5bc;
  }
}
</style>