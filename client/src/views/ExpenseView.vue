<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import CategoryPicker from '@/components/CategoryPicker.vue'
import MonthlyExpensesView from './MonthlyExpensesView.vue'

type Step = 'amount' | 'category'
type View = 'add-expense' | 'monthly-expenses'

interface Expense {
  id: number
  amount: number
  categoryId?: number
  createdAt: string
}

const theme = useTheme()
const currentView = ref<View>('add-expense')
const step = ref<Step>('amount')
const amount = ref('')
const selectedCategory = ref<number | null>(null)
const expenses = ref<Expense[]>([])
let expenseIdCounter = 1

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

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

const formattedAmount = computed(() => {
  if (!amount.value) {
    return '0.00'
  }

  return Number(amount.value).toFixed(2)
})

const canConfirmAmount = computed(() => {
  return Number(amount.value) > 0
})

function addDigit(digit: string) {
  if (digit === '.' && amount.value.includes('.')) {
    return
  }

  if (amount.value === '0' && digit !== '.') {
    amount.value = digit
    return
  }

  const decimalPart = amount.value.split('.')[1]

  if (decimalPart && decimalPart.length >= 2) {
    return
  }

  amount.value += digit
}

function removeLastDigit() {
  amount.value = amount.value.slice(0, -1)
}

function confirmAmount() {
  if (!canConfirmAmount.value) {
    return
  }

  step.value = 'category'
}

function goBackToAmount() {
  step.value = 'amount'
}

function skipCategory() {
  selectedCategory.value = null
  addExpense()
}

function addExpense() {
  if (!canConfirmAmount.value) {
    return
  }

  const expense: Expense = {
    id: expenseIdCounter++,
    amount: Number(amount.value),
    categoryId: selectedCategory.value || undefined,
    createdAt: new Date().toISOString()
  }

  expenses.value.push(expense)
  console.log('New expense:', expense)

  amount.value = ''
  selectedCategory.value = null
  step.value = 'amount'
  currentView.value = 'monthly-expenses'
}

function goToAddExpense() {
  currentView.value = 'add-expense'
  step.value = 'amount'
}

// Watch for category selection to automatically add expense
watch(selectedCategory, (newCategory) => {
  if (newCategory !== null && step.value === 'category') {
    addExpense()
  }
})
</script>

<template>
  <v-main class="app-background">
    <v-container
      class="expense-page"
      max-width="600"
    >
      <v-fade-transition mode="out-in">

        <!-- ADD EXPENSE VIEW -->
        <div v-if="currentView === 'add-expense'" key="add-expense">
          <!-- Header -->
          <div class="mb-6">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h5 font-weight-bold">
                  Новый расход
                </div>

                <div class="text-body-2 text-medium-emphasis mt-1">
                  {{
                    step === 'amount'
                      ? 'Сколько вы потратили?'
                      : 'Расход почти готов'
                  }}
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

          <v-fade-transition mode="out-in">

            <!-- ================================= -->
            <!-- STEP 1: AMOUNT -->
            <!-- ================================= -->

            <div v-if="step === 'amount'" key="amount">

              <!-- Amount -->
              <v-card
                rounded="xl"
                elevation="0"
                class="amount-card mb-5"
              >
                <v-card-text class="py-8">
                  <div class="amount-display">
                    <span class="amount">
                      {{ formattedAmount }}
                    </span>

                    <span class="currency">
                      <img src="/byn-symbol.webp" alt="BYN" class="currency-symbol" />
                    </span>
                  </div>

                  <div class="text-center mt-2 summary-label">
                    Введите сумму расхода
                  </div>
                </v-card-text>
              </v-card>

              <!-- Keypad -->
              <v-card
                rounded="xl"
                elevation="0"
                class="keypad-card mb-5"
              >
                <v-card-text class="pa-3">
                  <v-row dense>

                    <v-col
                      v-for="digit in [
                        '1', '2', '3',
                        '4', '5', '6',
                        '7', '8', '9'
                      ]"
                      :key="digit"
                      cols="4"
                    >
                      <v-btn
                        block
                        height="64"
                        variant="text"
                        class="key-button"
                        @click="addDigit(digit)"
                      >
                        {{ digit }}
                      </v-btn>
                    </v-col>

                    <v-col cols="4">
                      <v-btn
                        block
                        height="64"
                        variant="text"
                        class="key-button"
                        @click="addDigit('.')"
                      >
                        .
                      </v-btn>
                    </v-col>

                    <v-col cols="4">
                      <v-btn
                        block
                        height="64"
                        variant="text"
                        class="key-button"
                        @click="addDigit('0')"
                      >
                        0
                      </v-btn>
                    </v-col>

                    <v-col cols="4">
                      <v-btn
                        block
                        height="64"
                        variant="text"
                        class="key-button"
                        @click="removeLastDigit"
                      >
                        <v-icon
                          icon="mdi-backspace-outline"
                          size="25"
                        />
                      </v-btn>
                    </v-col>

                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Confirm -->
              <v-btn
                block
                size="x-large"
                rounded="xl"
                color="primary"
                elevation="2"
                :disabled="!canConfirmAmount"
                prepend-icon="mdi-check"
                @click="confirmAmount"
              >
                Подтвердить сумму
              </v-btn>

            </div>


            <!-- ================================= -->
            <!-- STEP 2: CATEGORY -->
            <!-- ================================= -->

            <div v-else key="category">

              <!-- Amount summary -->
              <v-card
                rounded="xl"
                elevation="0"
                class="summary-card mb-6"
              >
                <v-card-text class="pa-5">

                  <div class="d-flex align-center justify-space-between">

                    <div>
                      <div class="summary-label">
                        Сумма расхода
                      </div>

                      <div class="summary-amount">
                        {{ formattedAmount }}
                        <img src="/byn-symbol.webp" alt="BYN" class="currency-symbol summary-currency" />
                      </div>
                    </div>

                    <v-btn
                      icon="mdi-pencil-outline"
                      variant="tonal"
                      color="primary"
                      aria-label="Изменить сумму"
                      @click="goBackToAmount"
                    />

                  </div>

                </v-card-text>
              </v-card>

              <!-- Category -->
              <div class="category-section">
                <div class="category-header">
                  <div>
                    <div class="category-title">
                      Если хотите, выберите категорию
                    </div>

                    <div class="category-subtitle">
                      Это поможет удобнее отслеживать расходы
                    </div>
                  </div>

                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    @click="skipCategory"
                  >
                    Пропустить
                  </v-btn>
                </div>
              </div>

              <CategoryPicker
                v-model="selectedCategory"
                :categories="categories"
              />

            </div>

          </v-fade-transition>
        </div>

        <!-- MONTHLY EXPENSES VIEW -->
        <MonthlyExpensesView
          v-else
          key="monthly-expenses"
          :expenses="expenses"
          @add-expense="goToAddExpense"
        />

      </v-fade-transition>
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

/* Amount */

.amount-card {
  background: linear-gradient(
    135deg,
    #e8f5e9,
    #e0f2f1
  );
}

.v-theme--dark .amount-card {
  background: linear-gradient(
    135deg,
    #1E3A2F,
    #1A3A38
  );
}

.amount-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
}

.amount {
  font-size: 52px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -1.5px;
  color: #263238;
}

.currency {
  font-size: 25px;
  font-weight: 600;
  color: #607d8b;
}

.currency-symbol {
  height: 16px;
  width: auto;
  vertical-align: middle;
  margin-left: 2px;
}

.summary-currency {
  height: 14px;
}

.v-theme--dark .amount {
  color: #E0E0E0;
}

.v-theme--dark .currency {
  color: #B0BEC5;
}

/* Keypad */

.keypad-card {
  background: #ffffff;
  border: 1px solid #edf0f3;
}

.v-theme--dark .keypad-card {
  background: #1E1E1E;
  border: 1px solid #2C2C2C;
}

.key-button {
  border-radius: 16px;
  font-size: 25px;
  font-weight: 500;
  color: #263238;
}

.key-button:hover {
  background: #f1f8e9;
}

.v-theme--dark .key-button {
  color: #E0E0E0;
}

.v-theme--dark .key-button:hover {
  background: #2C2C2C;
}

/* Summary */

.summary-card {
  background: linear-gradient(
    135deg,
    #e8f5e9 0%,
    #e0f2f1 100%
  );

  border: 1px solid #d7ebe6;
}

.v-theme--dark .summary-card {
  background: linear-gradient(
    135deg,
    #1E3A2F 0%,
    #1A3A38 100%
  );

  border: 1px solid #2C2C2C;
}

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: #607d8b;
}

.v-theme--dark .summary-label {
  color: #B0BEC5;
}

.summary-amount {
  margin-top: 4px;
  font-size: 36px;
  line-height: 1.2;
  font-weight: 700;
  color: #263238;
}

.v-theme--dark .summary-label {
  color: #90A4AE;
}

.v-theme--dark .summary-amount {
  color: #E0E0E0;
}

/* Category */

.category-section {
  margin-bottom: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-title {
  font-size: 18px;
  font-weight: 700;
  color: #263238;
}

.category-subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: #78909c;
}

.v-theme--dark .category-title {
  color: #E0E0E0;
}

.v-theme--dark .category-subtitle {
  color: #90A4AE;
}

/* Actions */

.actions {
  margin-top: 20px;
}

/* Mobile */

@media (max-width: 600px) {
  .expense-page {
    padding: 20px 16px 32px;
  }

  .amount {
    font-size: 46px;
  }

  .summary-amount {
    font-size: 32px;
  }

  .currency-symbol {
    height: 14px;
  }

  .summary-currency {
    height: 12px;
  }
}
</style>