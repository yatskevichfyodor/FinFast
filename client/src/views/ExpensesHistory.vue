<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'

import {
  useExpenseStore,
  type Expense
} from '@/stores/expense'

const expenseStore = useExpenseStore()

const emit = defineEmits<{
  'add-expense': []
  'edit-expense': [expense: Expense]
}>()

const theme = useTheme()
const deleteDialogOpen = ref(false)
const expenseToDelete = ref<Expense | null>(null)
const categories = [
  {
    id: 1,
    name: 'Еда',
    icon: 'mdi-food',
    color: '#FF7043'
  },
  {
    id: 2,
    name: 'Транспорт',
    icon: 'mdi-car',
    color: '#42A5F5'
  },
  {
    id: 3,
    name: 'Дом',
    icon: 'mdi-home',
    color: '#AB47BC'
  },
  {
    id: 4,
    name: 'Покупки',
    icon: 'mdi-shopping',
    color: '#EC407A'
  },
  {
    id: 5,
    name: 'Развлечения',
    icon: 'mdi-gamepad-variant',
    color: '#7E57C2'
  },
  {
    id: 6,
    name: 'Здоровье',
    icon: 'mdi-heart-pulse',
    color: '#26A69A'
  },
  {
    id: 7,
    name: 'Подписки',
    icon: 'mdi-calendar-check',
    color: '#FFCA28'
  },
  {
    id: 8,
    name: 'Другое',
    icon: 'mdi-dots-horizontal-circle',
    color: '#78909C'
  }
]

const getCategoryById = (id: number | undefined) => {
  return categories.find(cat => cat.id === id)
}

const getCategoryDisplay = (categoryId: number | undefined) => {
  if (categoryId === undefined || categoryId === null) {
    return {
      name: 'Без категории',
      icon: 'mdi-help-circle-outline',
      color: '#9E9E9E'
    }
  }
  return getCategoryById(categoryId) || {
    name: 'Без категории',
    icon: 'mdi-help-circle-outline',
    color: '#9E9E9E'
  }
}

const groupedExpenses = computed(() => {
  const groups: Record<string, Expense[]> = {}

  expenseStore.expenses.forEach((expense: Expense) => {
    const date = new Date(expense.createdAt)
    const dateKey = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    })

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }

    groups[dateKey]!.push(expense)
  })

  return Object.entries(groups)
    .map(([date, dayExpenses]) => {
      const sortedDayExpenses = [...dayExpenses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return [date, sortedDayExpenses] as const
    })
    .sort((a, b) => {
      const dateA = new Date(a[1][0]?.createdAt || '')
      const dateB = new Date(b[1][0]?.createdAt || '')
      return dateB.getTime() - dateA.getTime()
    })
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

function openDeleteDialog(expense: Expense) {
  expenseToDelete.value = expense
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  expenseToDelete.value = null
}

function confirmDelete() {
  if (!expenseToDelete.value) {
    return
  }

  // emit('delete-expense', expenseToDelete.value.id)
  closeDeleteDialog()
}
</script>

<template>
  <v-main class="app-background">
    <v-container
      class="expense-page"
      max-width="600"
    >
      <!-- Header -->
      <div class="mb-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h5 font-weight-bold">
              История расходов
            </div>

            <div class="text-body-2 text-medium-emphasis mt-1">
              Сначала новые
            </div>
          </div>

          <v-btn
            :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="tonal"
            color="primary"
            @click="toggleTheme"
          />
        </div>
      </div>

      <!-- Expenses List -->
      <div v-if="expenseStore.expenses.length === 0" class="empty-state">
        <v-icon
          icon="mdi-receipt-long-outline"
          size="64"
          color="medium-emphasis"
          class="mb-3"
        />

        <div class="text-h6 font-weight-medium text-medium-emphasis mb-2">
          Пока нет расходов
        </div>

        <div class="text-body-2 text-medium-emphasis">
          Добавьте первый расход, чтобы начать отслеживание
        </div>
      </div>

      <div v-else>
        <div
          v-for="[date, dayExpenses] in groupedExpenses"
          :key="date"
          class="day-group mb-5"
        >
          <div class="day-header">
            <div class="day-date">
              {{ date }}
            </div>

            <div class="day-total">
              {{
                dayExpenses
                  .reduce((sum: number, exp: Expense) => sum + exp.amount, 0)
                  .toFixed(2)
              }}
              <img src="/byn-symbol.webp" alt="BYN" class="currency-symbol" />
            </div>
          </div>

          <v-card
            v-for="expense in dayExpenses"
            :key="expense.id"
            rounded="xl"
            elevation="0"
            class="expense-card mb-2"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-center">
                <div
                  class="expense-icon"
                  :style="{
                    '--category-color': getCategoryDisplay(expense.categoryId).color
                  }"
                >
                  <v-icon
                    :icon="getCategoryDisplay(expense.categoryId).icon"
                    size="24"
                  />
                </div>

                <div class="expense-info flex-grow-1">
                  <div class="expense-category">
                    {{ getCategoryDisplay(expense.categoryId).name }}
                  </div>

                  <div class="expense-time">
                    {{ formatTime(expense.createdAt) }}
                  </div>
                </div>

                <div class="expense-amount">
                  {{ expense.amount.toFixed(2) }}
                  <span><img src="/byn-symbol.webp" alt="BYN" class="currency-symbol" /></span>
                </div>

                <v-menu location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn
                      v-bind="menuProps"
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      class="expense-menu-btn ml-1"
                      aria-label="Действия с расходом"
                    />
                  </template>

                  <v-list density="compact" rounded="lg">
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      title="Редактировать"
                      @click="emit('edit-expense', expense)"
                    />

                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Удалить"
                      base-color="error"
                      @click="openDeleteDialog(expense)"
                    />
                  </v-list>
                </v-menu>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <v-dialog
        v-model="deleteDialogOpen"
        max-width="400"
      >
        <v-card rounded="xl">
          <v-card-title class="text-h6 font-weight-bold pt-5 px-5">
            Удалить расход?
          </v-card-title>

          <v-card-text class="px-5">
            <template v-if="expenseToDelete">
              Расход на сумму
              <strong>{{ expenseToDelete.amount.toFixed(2) }}</strong>
              будет удалён без возможности восстановления.
            </template>
          </v-card-text>

          <v-card-actions class="px-5 pb-5">
            <v-spacer />

            <v-btn
              variant="text"
              @click="closeDeleteDialog"
            >
              Отмена
            </v-btn>

            <v-btn
              color="error"
              variant="flat"
              @click="confirmDelete"
            >
              Удалить
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Add New Expense Button -->
      <v-btn
        block
        size="x-large"
        rounded="xl"
        color="primary"
        elevation="2"
        prepend-icon="mdi-plus"
        class="mt-4"
        @click="emit('add-expense')"
      >
        Добавить расход
      </v-btn>

    </v-container>
  </v-main>
</template>

<style scoped>
.app-background {
  min-height: 100vh;
  background: #f6f8fb;
  transition: background-color 0.3s ease;
}

.v-theme--dark .app-background {
  background: #121212;
}

.v-theme--dark .text-h5 {
  color: #E0E0E0;
}

.v-theme--dark .text-body-2 {
  color: #B0BEC5;
}

.expense-page {
  min-height: 100vh;
  padding-top: 32px;
  padding-bottom: 40px;
}

.total-card {
  background: linear-gradient(
    135deg,
    #e8f5e9 0%,
    #e0f2f1 100%
  );

  border: 1px solid #d7ebe6;
}

.v-theme--dark .total-card {
  background: linear-gradient(
    135deg,
    #1E3A2F 0%,
    #1A3A38 100%
  );

  border: 1px solid #2C2C2C;
}

.total-label {
  font-size: 14px;
  font-weight: 500;
  color: #607d8b;
}

.total-amount {
  margin-top: 8px;
  font-size: 42px;
  line-height: 1.2;
  font-weight: 700;
  color: #263238;
}

.total-amount .currency-symbol {
  height: 28px;
  width: auto;
  vertical-align: middle;
  margin-left: 4px;
}

.v-theme--dark .total-label {
  color: #90A4AE;
}

.v-theme--dark .total-amount {
  color: #E0E0E0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.day-group {
  margin-bottom: 20px;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.day-date {
  font-size: 14px;
  font-weight: 600;
  color: #455a64;
}

.day-total {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
}

.day-total .currency-symbol {
  height: 10px;
  width: auto;
  vertical-align: middle;
  margin-left: 2px;
}

.v-theme--dark .day-date {
  color: #B0BEC5;
}

.v-theme--dark .day-total {
  color: #E0E0E0;
}

.expense-card {
  background: #ffffff;
  border: 1px solid #edf0f3;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.expense-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.v-theme--dark .expense-card {
  background: #1E1E1E;
  border: 1px solid #2C2C2C;
}

.expense-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--category-color);
  background: color-mix(
    in srgb,
    var(--category-color) 10%,
    white
  );
  margin-right: 12px;
}

.v-theme--dark .expense-icon {
  background: color-mix(
    in srgb,
    var(--category-color) 20%,
    #1E1E1E
  );
}

.expense-info {
  flex: 1;
}

.expense-category {
  font-size: 15px;
  font-weight: 600;
  color: #263238;
}

.expense-time {
  font-size: 12px;
  color: #78909c;
  margin-top: 2px;
}

.v-theme--dark .expense-category {
  color: #E0E0E0;
}

.v-theme--dark .expense-time {
  color: #90A4AE;
}

.expense-amount {
  font-size: 18px;
  font-weight: 700;
  color: #263238;
  white-space: nowrap;
}

.expense-menu-btn {
  flex-shrink: 0;
}

.currency-symbol {
  height: 12px;
  width: auto;
  vertical-align: middle;
  margin-left: 2px;
}

.v-theme--dark .expense-amount {
  color: #E0E0E0;
}

@media (max-width: 600px) {
  .expense-page {
    padding: 20px 16px 32px;
  }

  .total-amount {
    font-size: 36px;
  }

  .total-amount .currency-symbol {
    height: 24px;
  }
}
</style>
