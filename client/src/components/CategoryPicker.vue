<script setup lang="ts">
export interface Category {
  id: number
  name: string
  icon: string
  color: string
}

defineProps<{
  categories: Category[]
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

function selectCategory(categoryId: number) {
  if (categoryId === undefined) {
    emit('update:modelValue', null)
    return
  }

  emit(
    'update:modelValue',
    categoryId
  )
}
</script>

<template>
  <div>
    <div class="category-header">
      <div>
        <div class="text-subtitle-1 font-weight-bold">
          Категория
        </div>

        <div class="text-body-2 text-medium-emphasis">
          Необязательно
        </div>
      </div>
    </div>

    <v-row
      dense
      class="mt-2"
    >
      <v-col
        v-for="category in categories"
        :key="category.id"
        cols="3"
      >
        <v-card
          class="category-card"
          :class="{
            selected: modelValue === category.id
          }"
          :style="{
            '--category-color': category.color
          }"
          rounded="xl"
          elevation="0"
          @click="selectCategory(category.id)"
        >
          <v-card-text class="category-content">

            <div
              class="category-icon"
              :class="{
                selected: modelValue === category.id
              }"
              :style="{
                '--category-color': category.color
              }"
            >
              <v-icon
                :icon="category.icon"
                size="26"
              />
            </div>

            <div class="category-name">
              {{ category.name }}
            </div>

            <v-icon
              v-if="modelValue === category.id"
              icon="mdi-check-circle"
              class="check-icon"
              size="18"
            />

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

.v-theme--dark .text-subtitle-1 {
  color: #E0E0E0;
}

.v-theme--dark .text-body-2 {
  color: #B0BEC5;
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

.v-theme--dark .category-card {
  background: #1E1E1E;
  border: 2px solid #2C2C2C;
}

.v-theme--dark .category-card:hover {
  border-color: #3C3C3C;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.3);
}

.category-card.selected {
  border-color: var(--category-color);

  box-shadow:
    0 5px 15px
    color-mix(
      in srgb,
      var(--category-color) 18%,
      transparent
    );
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

  background: color-mix(
    in srgb,
    var(--category-color) 10%,
    white
  );

  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.v-theme--dark .category-icon {
  background: color-mix(
    in srgb,
    var(--category-color) 20%,
    #1E1E1E
  );
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

.v-theme--dark .category-name {
  color: #B0BEC5;
}

.check-icon {
  position: absolute;
  top: 7px;
  right: 7px;

  color: var(--category-color);
}
</style>