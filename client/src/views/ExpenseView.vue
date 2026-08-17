<script setup lang="ts">
import { ref } from 'vue'
import CategoryPicker from '../components/CategoryPicker.vue'

const amount = ref('')
const categoryId = ref<number>()

const categories = [
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

  // Здесь позже будет:
  // POST /api/expenses

  amount.value = ''
  categoryId.value = undefined
}
</script>

<template>
  <main class="expense-page">

    <header class="header">
      <h1>Новый расход</h1>
    </header>

    <section class="amount-section">
      <div class="amount-display">
        <span>{{ amount || '0' }}</span>
        <span>₾</span>
      </div>

      <input
        v-model="amount"
        type="number"
        inputmode="decimal"
        placeholder="Введите сумму"
        autofocus
      />
    </section>

    <section class="category-section">
      <h2>Категория</h2>

      <CategoryPicker
        v-model="categoryId"
        :categories="categories"
      />
    </section>

    <button
      class="add-button"
      :disabled="!amount || Number(amount) <= 0"
      @click="addExpense"
    >
      Добавить расход
    </button>

  </main>
</template>