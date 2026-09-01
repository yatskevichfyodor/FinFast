<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CategoryPicker from '@/components/CategoryPicker.vue'
import {
  useExpenseStore,
  type ExpensePayload
} from '@/stores/expense'

const router = useRouter()
const route = useRoute()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const expenseStore = useExpenseStore()

const isEditing = computed(() => route.query.id !== undefined)

const amount = ref('')
const description = ref('')
const selectedCategoryId = ref<string | null>(null)
const paymentDate = ref<string | null>(null)

const initialDescription = ref<string>('')
const initialPaymentDate = ref<string>('')

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

function handleSubmit() {
  if (!canConfirmAmount.value) {
    return
  }

  const amountValue = Number(amount.value)

  if (isEditing.value) {
    const expenseId = route.query.id as string
    const expense = expenseStore.getExpenseById(expenseId)
    
    if (expense) {
      const updatePayload: ExpensePayload = {
        id: expenseId,
        amount: amountValue,
        categoryId: selectedCategoryId.value !== null ? selectedCategoryId.value : expense.categoryId,
        description: description.value || undefined,
        paymentDate: paymentDate.value || undefined
      }
      expenseStore.updateExpense(updatePayload)
    }

    router.push({
      name: "expense-history"
    })
  } else {
    const payload: ExpensePayload = {
      amount: amountValue,
      categoryId: selectedCategoryId.value || undefined,
      description: description.value || undefined,
      paymentDate: paymentDate.value || undefined
    }
    expenseStore.addExpense(payload)
    router.push({
      name: "expense-history"
    })
  }
}

function handleCancel() {
  emit('cancel')
}

function reset() {
  amount.value = ''
  description.value = ''
  selectedCategoryId.value = null
  paymentDate.value = null
}

const watchAmount = () => {
  if (route.query.amount !== undefined) {
    amount.value = String(route.query.amount)
  }
}

const watchCategoryId = () => {
  if (route.query.categoryId !== undefined) {
    selectedCategoryId.value = route.query.categoryId as string
  }
}

const loadExistingExpense = () => {
  if (isEditing.value && route.query.id) {
    const expense = expenseStore.getExpenseById(route.query.id as string)
    if (expense) {
      initialDescription.value = expense.description || ''
      initialPaymentDate.value = expense.paymentDate || ''
      description.value = initialDescription.value
      paymentDate.value = initialPaymentDate.value
    }
  }
}

watchAmount()
watchCategoryId()
loadExistingExpense()
</script>

<template>
  <v-main class="app-background">
    <v-container class="expense-page" max-width="600">
      <div class="mb-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h5 font-weight-bold">
              {{ isEditing ? 'Редактирование расхода' : 'Новый расход' }}
            </div>

            <div class="text-body-2 text-medium-emphasis mt-1">
              Сколько вы потратили?
            </div>
          </div>

          <v-btn
            v-if="isEditing"
            icon="mdi-close"
            variant="tonal"
            aria-label="Отменить редактирование"
            @click="handleCancel"
          />
        </div>
      </div>

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
              <img
                src="/byn-symbol.webp"
                alt="BYN"
                class="currency-symbol"
              />
            </span>
          </div>

          <div class="text-center mt-2 summary-label">
            Введите сумму расхода
          </div>
        </v-card-text>
      </v-card>

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

      <v-card
        rounded="xl"
        elevation="0"
        class="mb-5"
      >
        <v-card-text>
          <div class="text-subtitle-1 font-weight-medium mb-3">
            Дополнительно
          </div>

          <CategoryPicker
            v-model:selectedCategoryId="selectedCategoryId"
          />

          <v-text-field
            v-model="description"
            label="Описание (что куплено)"
            placeholder="Например: продукты, обед, бензин"
            variant="outlined"
            density="comfortable"
            clearable
            class="mt-3"
          />

          <v-text-field
            v-model="paymentDate"
            label="Дата платежа"
            type="datetime-local"
            variant="outlined"
            density="comfortable"
            clearable
            hint="Оставьте пустым для текущей даты"
            persistent-hint
          />
        </v-card-text>
      </v-card>

      <v-btn
        block
        size="x-large"
        rounded="xl"
        color="primary"
        elevation="2"
        :disabled="!canConfirmAmount"
        prepend-icon="mdi-check"
        @click="handleSubmit"
      >
        {{ isEditing ? 'Сохранить изменения' : 'Готово' }}
      </v-btn>
    </v-container>
  </v-main>
</template>

<style scoped>
.amount-card {
  background: linear-gradient(
    135deg,
    #e8f5e9,
    #e0f2f1
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

.keypad-card {
  background: #ffffff;
  border: 1px solid #edf0f3;
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

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: #607d8b;
}

@media (max-width: 600px) {
  .amount {
    font-size: 46px;
  }
}
</style>