<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  expenseId?: string,
  amount?: number,
  isInputMode?: boolean,
  showHeader?: boolean
}>()

const emit = defineEmits<{
  submit: [amount: number]
  cancel: []
  'amount-change': [amount: number, valid: boolean]
}>()

const amount = ref('')

const isEditing = computed(() => props.expenseId !== undefined)
const isInputMode = computed(() => props.isInputMode !== false)
const showHeader = computed(() => props.showHeader !== false)

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

  if (digit === '.' && !amount.value) {
    amount.value = '0.'
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

function submit() {
  if (!canConfirmAmount.value) {
    return
  }

  emit('submit', Number(amount.value))
}

function reset() {
  amount.value = ''
}

function loadAmount(value?: number) {
  if (value === undefined) {
    reset()
    return
  }

  amount.value = String(value)
}

watch(
  () => props.amount,
  (value) => {
    loadAmount(value)
    emit('amount-change', Number(value ?? 0), Number(value ?? 0) > 0)
  },
  { immediate: true }
)

watch(
  () => amount.value,
  (value) => {
    const numValue = Number(value)
    const isValid = value !== '' && numValue > 0
    emit('amount-change', numValue, isValid)
  }
)
</script>

<template>
  <div class="expense-amount-input">
    <div v-if="showHeader" class="header-section">
      <div class="header-content">
        <div class="header-left">
          <div class="header-title">
            {{ isEditing ? 'Редактирование расхода' : 'Новый расход' }}
          </div>

          <div class="header-subtitle">
            Сколько вы потратили?
          </div>
        </div>

        <v-btn
          v-if="isEditing"
          icon="mdi-close"
          variant="tonal"
          aria-label="Отменить редактирование"
          class="header-button"
          @click="emit('cancel')"
        />
      </div>
    </div>

    <v-card
      rounded="xl"
      elevation="0"
      class="amount-card"
    >
      <v-card-text class="amount-card-text">
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

        <template v-if="isInputMode">
          <div class="summary-label">
            Введите сумму расхода
          </div>
        </template>
      </v-card-text>
    </v-card>

    <v-card
      v-if="isInputMode"
      rounded="xl"
      elevation="0"
      class="keypad-card"
    >
      <v-card-text class="keypad-card-text">
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
              variant="text"
              class="key-button"
              @click="removeLastDigit"
            >
              <v-icon
                icon="mdi-backspace-outline"
                size="24"
              />
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

  </div>
</template>

<style scoped>
.expense-amount-input {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
}

/* Header section */
.header-section {
  margin-bottom: 8px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: #263238;
  letter-spacing: -0.5px;
}

.header-subtitle {
  font-size: 14px;
  font-weight: 400;
  color: #607d8b;
  margin-top: 4px;
}

.header-button {
  flex-shrink: 0;
}

/* Amount card */
.amount-card {
  background: linear-gradient(
    135deg,
    #e8f5e9,
    #e0f2f1
  );
}

.amount-card-text {
  padding: 24px 16px;
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
  width: 24px;
  height: 24px;
}

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: #607d8b;
  text-align: center;
  margin-top: 12px;
}

/* Keypad card */
.keypad-card {
  background: #ffffff;
  border: 1px solid #edf0f3;
  touch-action: none;
}

.keypad-card-text {
  padding: 12px;
}

.key-button {
  border-radius: 16px;
  font-size: 25px;
  font-weight: 500;
  color: #263238;
  height: 64px;
}

.key-button:hover {
  background: #f1f8e9;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .expense-amount-input {
    gap: 12px;
  }

  .header-section {
    margin-bottom: 4px;
  }

  .header-title {
    font-size: 20px;
  }

  .header-subtitle {
    font-size: 13px;
  }

  .amount-card-text {
    padding: 20px 16px;
  }

  .amount {
    font-size: 46px;
  }

  .currency {
    font-size: 22px;
  }

  .currency-symbol {
    width: 22px;
    height: 22px;
  }

  .summary-label {
    font-size: 13px;
    margin-top: 8px;
  }

  .keypad-card-text {
    padding: 8px;
  }

  .key-button {
    height: 56px;
    font-size: 24px;
  }
}

/* Small phones */
@media (max-width: 360px) {
  .header-title {
    font-size: 18px;
  }

  .header-subtitle {
    font-size: 12px;
  }

  .amount-card-text {
    padding: 16px 12px;
  }

  .amount {
    font-size: 40px;
  }

  .currency {
    font-size: 20px;
  }

  .currency-symbol {
    width: 20px;
    height: 20px;
  }

  .key-button {
    height: 52px;
    font-size: 22px;
  }
}

/* Short viewport handling */
@media (max-height: 600px) and (max-width: 600px) {
  .expense-amount-input {
    gap: 8px;
  }

  .header-section {
    margin-bottom: 0;
  }

  .header-title {
    font-size: 18px;
  }

  .header-subtitle {
    font-size: 12px;
    margin-top: 2px;
  }

  .amount-card-text {
    padding: 16px 12px;
  }

  .amount {
    font-size: 36px;
  }

  .currency {
    font-size: 18px;
  }

  .currency-symbol {
    width: 18px;
    height: 18px;
  }

  .summary-label {
    font-size: 12px;
    margin-top: 6px;
  }

  .keypad-card-text {
    padding: 6px;
  }

  .key-button {
    height: 48px;
    font-size: 20px;
  }
}
</style>