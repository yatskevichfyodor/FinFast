<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { loadExpenses as loadStoredExpenses } from '@/services/expenseStorage'
import {
  useExpenseStore,
  type Expense
} from '@/stores/expense'
import { getCategoryDisplay } from '@/utils/categoryHelpers'
import { formatDate, formatTime } from '@/utils/dateHelpers'
import {
  createCsvExport,
  createJsonExport,
  downloadExport,
  type ExportFormat
} from '@/services/expenseExport'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const expenseStore = useExpenseStore()

onMounted(() => {
  void expenseStore.refreshExpenses()
})

const deleteDialogOpen = ref(false)
const expenseToDelete = ref<Expense | null>(null)
const exportDialogOpen = ref(false)
const exportFormat = ref<ExportFormat>('json')

const activeExpenses = computed(() =>
  expenseStore.expenses.filter(expense => !expense.isDeleted)
)

const groupedExpenses = computed(() => {
  const groups: Record<string, Expense[]> = {}

  activeExpenses.value.forEach((expense: Expense) => {
    const dateKey = formatDate(expense.createdAt)

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

  expenseStore.deleteExpense(expenseToDelete.value.id)
  closeDeleteDialog()
}

function editExpenseAmount(expense: Expense) {
  router.push({
    name: 'ExpenseAmountInputView',
    query: { id: expense.id, amount: expense.amount.toString(), categoryId: expense.categoryId }
  })
}

function editExpenseCategory(expense: Expense) {
  router.push({
    name: 'ExpenseCategorySelectionView',
    state: { expenseId: expense.id, isEditing: true }
  })
}

async function exportExpenses() {
  if (!authStore.userId) {
    return
  }

  const expenses = await loadStoredExpenses(authStore.userId)
  const content = exportFormat.value === 'json'
    ? createJsonExport(expenses)
    : createCsvExport(expenses)

  downloadExport(content, exportFormat.value)
  exportDialogOpen.value = false
}
</script>

<template>
  <v-main class="app-background">
    <v-container class="expense-page" max-width="600">
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
            prepend-icon="mdi-download"
            variant="outlined"
            size="small"
            @click="exportDialogOpen = true"
          >
            Экспортировать данные
          </v-btn>
        </div>
      </div>

      <!-- Expenses List -->
      <div v-if="activeExpenses.length === 0" class="empty-state">
        <v-icon icon="mdi-receipt-long-outline" size="64" color="medium-emphasis" class="mb-3" />

        <div class="text-h6 font-weight-medium text-medium-emphasis mb-2">
          Пока нет расходов
        </div>

        <div class="text-body-2 text-medium-emphasis">
          Добавьте первый расход, чтобы начать отслеживание
        </div>
      </div>

      <div v-else>
        <div v-for="[date, dayExpenses] in groupedExpenses" :key="date" class="day-group mb-5">
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

          <v-card v-for="expense in dayExpenses" :key="expense.id" rounded="xl" elevation="0" class="expense-card mb-2">
            <v-card-text class="pa-4">
              <div class="d-flex align-center">
                <div class="expense-icon" :style="{
                  '--category-color': getCategoryDisplay(expense.categoryId).color
                }">
                  <v-icon :icon="getCategoryDisplay(expense.categoryId).icon" size="24" />
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
                    <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="small"
                      class="expense-menu-btn ml-1" aria-label="Действия с расходом" />
                  </template>

                  <v-list density="compact" rounded="lg">
                    <v-list-item prepend-icon="mdi-currency-usd" title="Редактировать сумму"
                      @click="editExpenseAmount(expense)" />

                    <v-list-item prepend-icon="mdi-tag-outline" title="Редактировать категорию"
                      @click="editExpenseCategory(expense)" />

                    <v-list-item prepend-icon="mdi-delete-outline" title="Удалить" base-color="error"
                      @click="openDeleteDialog(expense)" />
                  </v-list>
                </v-menu>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <v-dialog v-model="deleteDialogOpen" max-width="400">
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

            <v-btn variant="text" @click="closeDeleteDialog">
              Отмена
            </v-btn>

            <v-btn color="error" variant="flat" @click="confirmDelete">
              Удалить
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="exportDialogOpen" max-width="440">
        <v-card rounded="xl">
          <v-card-title class="text-h6 font-weight-bold pt-5 px-5">
            Экспортировать данные
          </v-card-title>

          <v-card-text class="px-5">
            <v-radio-group v-model="exportFormat" hide-details>
              <v-radio value="json">
                <template #label>
                  <div>
                    <div class="font-weight-medium">JSON</div>
                    <div class="text-body-2 text-medium-emphasis">Для переноса данных и резервного копирования</div>
                  </div>
                </template>
              </v-radio>

              <v-radio value="csv">
                <template #label>
                  <div>
                    <div class="font-weight-medium">Excel</div>
                    <div class="text-body-2 text-medium-emphasis">Для просмотра и работы с данными в Excel</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card-text>

          <v-card-actions class="px-5 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="exportDialogOpen = false">Отмена</v-btn>
            <v-btn color="primary" variant="flat" @click="exportExpenses">Экспортировать</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    </v-container>
  </v-main>
</template>

<style scoped>
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

.expense-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--category-color);
  background: color-mix(in srgb,
      var(--category-color) 10%,
      white);
  margin-right: 12px;
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

.expense-amount {
  font-size: 18px;
  font-weight: 700;
  color: #263238;
  white-space: nowrap;
}

.expense-menu-btn {
  flex-shrink: 0;
}

</style>
