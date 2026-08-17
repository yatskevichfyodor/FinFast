<script setup lang="ts">
import { ref } from 'vue'

interface Category {
  id: number
  name: string
  icon: string
}

const amount = ref('')
const categoryId = ref<number | null>(null)

const categories: Category[] = [
  { id: 1, name: 'Еда', icon: '🍔' },
  { id: 2, name: 'Транспорт', icon: '🚕' },
  { id: 3, name: 'Дом', icon: '🏠' },
  { id: 4, name: 'Покупки', icon: '🛍️' },
  { id: 5, name: 'Развлечения', icon: '🎮' },
  { id: 6, name: 'Здоровье', icon: '💊' },
  { id: 7, name: 'Другое', icon: '📦' }
]

function addExpense() {
  const value = Number(amount.value)

  if (!value || value <= 0) {
    return
  }

  const expense = {
    amount: value,
    categoryId: categoryId.value,
    createdAt: new Date().toISOString()
  }

  console.log(expense)

  amount.value = ''
  categoryId.value = null
}
</script>

<template>
    <v-main>
      <v-container
        class="fill-height"
        max-width="600"
      >
        <v-card
          class="mx-auto w-100"
          elevation="3"
          rounded="xl"
        >
          <v-card-title class="text-h5 font-weight-bold pa-6 pb-2">
            Новый расход
          </v-card-title>

          <v-card-text class="pa-6">

            <!-- Сумма -->
            <div class="text-center mb-6">
              <div class="text-h3 font-weight-bold">
                {{ amount || '0' }}
                <span class="text-medium-emphasis">₾</span>
              </div>
            </div>

            <v-text-field
              v-model="amount"
              label="Сумма"
              placeholder="Введите сумму"
              type="number"
              inputmode="decimal"
              variant="outlined"
              prepend-inner-icon="mdi-cash"
              autofocus
              class="mb-6"
            />

            <!-- Категории -->
            <div class="text-subtitle-1 font-weight-medium mb-3">
              Категория
            </div>

            <v-row dense class="mb-6">
              <v-col
                v-for="category in categories"
                :key="category.id"
                cols="4"
                sm="3"
              >
                <v-card
                  :variant="
                    categoryId === category.id
                      ? 'elevated'
                      : 'outlined'
                  "
                  :color="
                    categoryId === category.id
                      ? 'primary'
                      : undefined
                  "
                  class="category-card text-center pa-3"
                  rounded="lg"
                  @click="categoryId = category.id"
                >
                  <div class="text-h4 mb-1">
                    {{ category.icon }}
                  </div>

                  <div class="text-caption">
                    {{ category.name }}
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Кнопка -->
            <v-btn
              color="primary"
              size="large"
              block
              rounded="lg"
              :disabled="!amount || Number(amount) <= 0"
              @click="addExpense"
            >
              Добавить расход
            </v-btn>

          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
</template>