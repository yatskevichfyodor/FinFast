<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CategoryPicker from '@/components/CategoryPicker.vue'
import ExpenseAmountInput from '@/components/ExpenseAmountInput.vue'
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
const editingExpenseId = computed(() => {
  const expenseId = route.query.id
  return typeof expenseId === 'string' ? expenseId : undefined
})

const description = ref('')
const selectedCategoryId = ref<string | null>(null)
const paymentDate = ref<string | null>(null)
const currentAmount = ref<number | null>(null)
const canSubmitAmount = ref(false)

const initialDescription = ref<string>('')
const initialPaymentDate = ref<string | null>(null)

const initialAmount = computed(() => {
  const value = route.query.amount
  return value !== undefined ? Number(value) : undefined
})

function handleAmountChange(amountValue: number, valid: boolean) {
  currentAmount.value = amountValue
  canSubmitAmount.value = valid
}

function submitCurrentAmount() {
  if (!canSubmitAmount.value || currentAmount.value === null) {
    return
  }

  handleSubmit(currentAmount.value)
}

function handleSubmit(amountValue: number) {
  if (amountValue <= 0) {
    return
  }

  // Convert YYYY-MM-DD to ISO format if payment date is provided
  // Use noon time to avoid timezone issues
  const paymentDateIso = paymentDate.value ? `${paymentDate.value}T12:00:00.000Z` : undefined

  if (isEditing.value) {
    const expenseId = editingExpenseId.value
    if (!expenseId) {
      return
    }

    const expense = expenseStore.getExpenseById(expenseId)

    if (expense) {
      const updatePayload: ExpensePayload = {
        id: expenseId,
        amount: amountValue,
        categoryId: selectedCategoryId.value !== null ? selectedCategoryId.value : expense.categoryId,
        description: description.value || undefined,
        paymentDate: paymentDateIso
      }
      expenseStore.updateExpense(updatePayload)
    }

    router.push({
      name: 'expense-history'
    })
  } else {
    const payload: ExpensePayload = {
      amount: amountValue,
      categoryId: selectedCategoryId.value || undefined,
      description: description.value || undefined,
      paymentDate: paymentDateIso
    }
    expenseStore.addExpense(payload)
    router.push({
      name: 'expense-history'
    })
  }
}

function handleCancel() {
  emit('cancel')
}

const watchCategoryId = () => {
  if (route.query.categoryId !== undefined) {
    selectedCategoryId.value = route.query.categoryId as string
  }
}

const loadExistingExpense = () => {
  const expenseId = editingExpenseId.value
  if (isEditing.value && expenseId) {
    const expense = expenseStore.getExpenseById(expenseId)
    if (expense) {
      initialDescription.value = expense.description || ''
      // Convert ISO date to YYYY-MM-DD format for v-date-input
      initialPaymentDate.value = expense.paymentDate ? (expense.paymentDate.split('T')[0] || null) : null
      description.value = initialDescription.value
      paymentDate.value = initialPaymentDate.value
    }
  } else if (route.query.paymentDate !== undefined) {
    // Load payment date from query parameter and convert to YYYY-MM-DD format
    const queryDate = route.query.paymentDate as string
    const convertedDate = queryDate.split('T')[0] || null
    paymentDate.value = convertedDate
    initialPaymentDate.value = convertedDate
  }
}

watchCategoryId()
loadExistingExpense()
</script>

<template>
  <v-main class="app-background expense-main">
    <div class="expense-container">
      <div class="scrollable-content">
        <v-container class="expense-page" max-width="600">
          <ExpenseAmountInput
            :expense-id="editingExpenseId"
            :amount="initialAmount"
            @submit="handleSubmit"
            @cancel="handleCancel"
            @amount-change="handleAmountChange"
          />

          <v-card
            rounded="xl"
            elevation="0"
            class="additional-fields-card mb-5"
          >
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-medium mb-4">
                Дополнительно
              </div>

              <CategoryPicker
                v-model:selectedCategoryId="selectedCategoryId"
              />

              <div class="field-group mt-4">
                <v-text-field
                  v-model="description"
                  label="Описание"
                  placeholder="Например: продукты, обед, бензин"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  class="custom-text-field"
                  color="primary"
                  prepend-inner-icon="mdi-text"
                >
                  <template #append-inner>
                    <v-icon 
                      v-if="!description" 
                      color="grey-lighten-1" 
                      size="20"
                    >
                      mdi-pencil-outline
                    </v-icon>
                  </template>
                </v-text-field>
              </div>

              <div class="field-group">
                <v-date-input
                  v-model="paymentDate"
                  label="Дата платежа"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  hide-actions
                  input-format="yyyy.mm.dd"
                  persistent-hint
                  class="custom-text-field"
                  color="primary"
                  prepend-icon="mdi-calendar"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-container>
      </div>

      <div class="fixed-bottom-panel">
        <v-container class="pa-0" max-width="600">
          <div class="button-container">
            <v-btn
              block
              size="x-large"
              rounded="xl"
              color="primary"
              elevation="2"
              :disabled="!canSubmitAmount"
              prepend-icon="mdi-check"
              class="submit-button"
              @click="submitCurrentAmount"
            >
              {{ isEditing ? 'Сохранить изменения' : 'Готово' }}
            </v-btn>
          </div>
        </v-container>
      </div>
    </div>
  </v-main>
</template>

<style scoped>
.expense-main {
  height: 100vh;
  overflow: hidden;
}

.expense-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 24px;
}

.fixed-bottom-panel {
  position: sticky;
  bottom: 0;
  flex-shrink: 0;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 0;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 10;
}

.button-container {
  padding: 0 16px;
}

.submit-button {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  min-height: 56px;
}

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

.additional-fields-card {
  background: #ffffff;
  border: 1px solid #edf0f3;
}

.field-group {
  margin-bottom: 16px;
}

.field-group:last-child {
  margin-bottom: 0;
}

.custom-text-field {
  border-radius: 12px;
}

.custom-text-field :deep(.v-field) {
  border-radius: 12px;
}

.custom-text-field :deep(.v-field__outline) {
  border-radius: 12px;
}

.custom-text-field :deep(.v-label) {
  font-size: 14px;
  color: #546e7a;
}

.custom-text-field :deep(.v-input__prepend-inner) {
  padding-left: 12px;
  padding-right: 8px;
}

.custom-text-field :deep(.v-input__append-inner) {
  padding-right: 8px;
}

@media (max-width: 600px) {
  .amount {
    font-size: 46px;
  }

  .fixed-bottom-panel {
    padding: 12px 0;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }

  .button-container {
    padding: 0 12px;
  }

  .submit-button {
    font-size: 15px;
    min-height: 52px;
  }
}

@media (max-width: 360px) {
  .amount {
    font-size: 40px;
  }

  .key-button {
    height: 56px;
    font-size: 22px;
  }
}
</style>