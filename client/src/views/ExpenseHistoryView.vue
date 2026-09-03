<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  useExpenseStore,
  type Expense
} from '@/stores/expense'
import { getCategoryDisplay } from '@/utils/categoryHelpers'
import { formatDate, formatTime, parseDate } from '@/utils/dateHelpers'
import ExportDialog from '@/components/ExportDialog.vue'
import ImportDialog from '@/components/ImportDialog.vue'

const router = useRouter()
const expenseStore = useExpenseStore()

onMounted(() => {
  void expenseStore.refreshExpenses()
})

const deleteDialogOpen = ref(false)
const expenseToDelete = ref<Expense | null>(null)
const exportDialogOpen = ref(false)
const importDialogOpen = ref(false)

const activeExpenses = computed(() =>
  expenseStore.expenses.filter(expense => !expense.isDeleted)
)

const groupedExpenses = computed(() => {
  const groups: Record<string, Expense[]> = {}

  activeExpenses.value.forEach((expense: Expense) => {
    const dateForGrouping = expense.paymentDate || expense.createdAt
    if (!dateForGrouping) {
      return
    }
    
    const date = parseDate(dateForGrouping)
    
    // Skip invalid dates
    if (isNaN(date.getTime())) {
      return
    }
    
    const dateKey = formatDate(dateForGrouping)

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }

    groups[dateKey]!.push(expense)
  })

  return Object.entries(groups)
    .map(([date, dayExpenses]) => {
      const sortedDayExpenses = [...dayExpenses].sort(
        (a, b) => {
          const dateA = parseDate(a.paymentDate || a.createdAt)
          const dateB = parseDate(b.paymentDate || b.createdAt)
          return dateB.getTime() - dateA.getTime()
        }
      )

      return [date, sortedDayExpenses] as const
    })
    .sort((a, b) => {
      const dateA = parseDate(a[1][0]?.paymentDate || a[1][0]?.createdAt || '')
      const dateB = parseDate(b[1][0]?.paymentDate || b[1][0]?.createdAt || '')
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

function editExpense(expense: Expense) {
  router.push({
    name: 'expense-payment-form',
    query: { 
      id: expense.id, 
      amount: expense.amount.toString(), 
      categoryId: expense.categoryId
    }
  })
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

           <div class="header-actions d-flex align-center">
             <v-btn
               prepend-icon="mdi-upload"
               variant="tonal"
               size="small"
               rounded="lg"
               class="operation-button"
               @click="importDialogOpen = true"
             >
               Импорт
             </v-btn>

             <v-btn
               prepend-icon="mdi-download"
               variant="tonal"
               size="small"
               rounded="lg"
               class="operation-button"
               @click="exportDialogOpen = true"
             >
               Экспорт
             </v-btn>
           </div>
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

                  <div v-if="expense.description" class="expense-description">
                    {{ expense.description }}
                  </div>

                  <div class="expense-time">
                    {{ formatTime(expense.paymentDate || expense.createdAt) }}
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
                    <v-list-item prepend-icon="mdi-pencil-outline" title="Редактировать"
                      @click="editExpense(expense)" />

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

      <ExportDialog v-model="exportDialogOpen" />

       <ImportDialog v-model="importDialogOpen" />

     </v-container>
  </v-main>
</template>

<style scoped>
.operation-button {
  color: #16436f !important;
  background: #dce9f5 !important;
  box-shadow: none;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.header-actions {
  gap: 12px;
  flex-shrink: 0;
}

.operation-button:hover {
  color: #12395f !important;
  background: #cfe0f0 !important;
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

.expense-description {
  font-size: 13px;
  color: #546e7a;
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

@media (max-width: 520px) {
  .header-actions {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

</style>
