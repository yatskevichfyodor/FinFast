<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import CategoryPicker from "@/components/CategoryPicker.vue";
import ExpenseAmountInput from "@/components/ExpenseAmountInput.vue";
import { useExpenseStore, type ExpensePayload } from "@/stores/expense";
import { format, parse } from "date-fns";

const router = useRouter();
const route = useRoute();

const emit = defineEmits<{
  saved: [];
  cancel: [];
}>();

const expenseStore = useExpenseStore();

// Breakpoint for mobile/desktop mode
const MOBILE_BREAKPOINT = 960;

// Responsive state
const isMobile = ref(true);
const windowWidth = ref(window.innerWidth);

function updateScreenWidth() {
  windowWidth.value = window.innerWidth;
  isMobile.value = windowWidth.value <= MOBILE_BREAKPOINT;
}

onMounted(() => {
  updateScreenWidth();
  window.addEventListener("resize", updateScreenWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateScreenWidth);
});

const today = new Date().toISOString().slice(0, 10);

// Form state
const isEditing = computed(() => route.query.id !== undefined);
const editingExpenseId = computed(() => {
  const expenseId = route.query.id;
  return typeof expenseId === "string" ? expenseId : undefined;
});

const description = ref("");
const selectedCategoryId = ref<string | null>(null);
const selectedCustomCategoryId = ref<string | null>(null);
const paymentDate = ref<Date | null>(null);
const currentAmount = ref<number | null>(null);
const canSubmitAmount = ref(false);

// Mobile step state
const mobileStep = ref(1);
const createdExpenseId = ref<string | null>(null);

const initialAmount = computed(() => {
  // When editing, load from existing expense instead of query parameter
  if (isEditing.value && editingExpenseId.value) {
    const expense = expenseStore.getExpenseById(editingExpenseId.value);
    return expense?.amount;
  }

  // For new expenses, load from query parameter
  const value = route.query.amount;
  return value !== undefined ? Number(value) : undefined;
});

const getButtonText = computed(() => {
  if (isEditing.value) {
    return "Сохранить изменения";
  }

  if (isMobile.value) {
    return mobileStep.value === 1 ? "Ввод" : "Готово";
  }

  return "Готово";
});

function handleAmountChange(amountValue: number, valid: boolean) {
  currentAmount.value = amountValue;
  canSubmitAmount.value = valid;
}

// Mobile step 1: Create expense with amount only
function handleMobileStep1Submit() {
  if (!canSubmitAmount.value || currentAmount.value === null) {
    return;
  }

  const amountValue = currentAmount.value;
  if (amountValue <= 0) {
    return;
  }

  const payload: ExpensePayload = {
    amount: amountValue,
    categoryId: selectedCategoryId.value || undefined,
    customCategoryId: selectedCustomCategoryId.value || undefined,
    description: description.value || undefined,
  };

  const newExpenseId = expenseStore.addExpense(payload);
  createdExpenseId.value = newExpenseId;

  // Move to step 2
  mobileStep.value = 2;
}

// Mobile step 2: Update expense if values changed
function handleMobileStep2Submit() {
  if (!createdExpenseId.value) {
    return;
  }

  const hasChanges = selectedCategoryId.value && description.value && paymentDate.value;

  if (hasChanges) {
    const updatePayload: ExpensePayload = {
      id: createdExpenseId.value,
      amount: currentAmount.value || 0,
      categoryId:
        selectedCategoryId.value !== null
          ? selectedCategoryId.value
          : undefined,
      customCategoryId: selectedCustomCategoryId.value || undefined,
      clearCategory: selectedCategoryId.value === null && selectedCustomCategoryId.value === null,
      description: description.value || undefined,
      paymentDate: paymentDate.value ? format(paymentDate.value, 'yyyy-MM-dd') : undefined,
    };
    expenseStore.updateExpense(updatePayload);
  }

  router.push({
    name: "expense-history",
  });
}

// Desktop single-step: Create expense with all data
function handleDesktopSubmit() {
  if (!canSubmitAmount.value || currentAmount.value === null) {
    return;
  }

  const amountValue = currentAmount.value;
  if (amountValue <= 0) {
    return;
  }

  const paymentDateFormatted = paymentDate.value ? format(paymentDate.value, 'yyyy-MM-dd') : undefined;

  if (isEditing.value) {
    const expenseId = editingExpenseId.value;
    if (!expenseId) {
      return;
    }

    const expense = expenseStore.getExpenseById(expenseId);

    if (expense) {
      const updatePayload: ExpensePayload = {
        id: expenseId,
        amount: amountValue,
        categoryId:
          selectedCategoryId.value !== null
            ? selectedCategoryId.value
            : undefined,
        customCategoryId: selectedCustomCategoryId.value || undefined,
        clearCategory: selectedCategoryId.value === null && selectedCustomCategoryId.value === null,
        description: description.value || undefined,
        paymentDate: paymentDateFormatted,
      };
      expenseStore.updateExpense(updatePayload);
    }

    router.push({
      name: "expense-history",
    });
  } else {
    const payload: ExpensePayload = {
      amount: amountValue,
      categoryId: selectedCategoryId.value || undefined,
      customCategoryId: selectedCustomCategoryId.value || undefined,
      description: description.value || undefined,
      paymentDate: paymentDateFormatted,
    };
    expenseStore.addExpense(payload);
    router.push({
      name: "expense-history",
    });
  }
}

function handleSubmit() {
  if (isEditing.value) {
    handleDesktopSubmit();
  } else if (isMobile.value) {
    if (mobileStep.value === 1) {
      handleMobileStep1Submit();
    } else {
      handleMobileStep2Submit();
    }
  } else {
    handleDesktopSubmit();
  }
}

function handleCancel() {
  emit("cancel");
}

const watchCategoryId = () => {
  if (route.query.categoryId !== undefined) {
    selectedCategoryId.value = route.query.categoryId as string;
  }
};

const loadExistingExpense = () => {
  const expenseId = editingExpenseId.value;
  if (isEditing.value && expenseId) {
    const expense = expenseStore.getExpenseById(expenseId);
    if (expense) {
      description.value = expense.description || "";
      paymentDate.value = expense.paymentDate ? parse(expense.paymentDate, 'yyyy-MM-dd', new Date()) : null;
      selectedCategoryId.value = expense.categoryId || null;
      selectedCustomCategoryId.value = expense.customCategoryId || null;
    }
  }
};

loadExistingExpense();
watchCategoryId();
</script>

<template>
  <v-main class="app-background expense-main">
    <div class="expense-container">
      <div class="scrollable-content">
        <!-- Desktop layout with centered header -->
        <div v-if="!isMobile && !isEditing" class="desktop-wrapper">
          <!-- Centered header -->
          <div class="desktop-header">
            <div class="text-h5 font-weight-bold text-center">Новый расход</div>
            <div class="text-body-2 text-medium-emphasis text-center mt-1">
              Сколько вы потратили?
            </div>
          </div>

          <div class="desktop-content">
            <!-- Amount Input (left side) -->
            <div class="amount-section">
              <ExpenseAmountInput
                :expense-id="editingExpenseId"
                :amount="initialAmount"
                :show-header="false"
                :isInputMode="true"
                @submit="handleSubmit"
                @cancel="handleCancel"
                @amount-change="handleAmountChange"
              />
            </div>

            <!-- Desktop: Show additional fields (right side) -->
            <div class="additional-section">
              <v-card rounded="xl" elevation="0" class="additional-fields-card">
                <v-card-text class="pa-4">
                  <div class="text-subtitle-1 font-weight-medium mb-4">
                    Дополнительно
                  </div>

                  <CategoryPicker
                    v-model:selectedCategoryId="selectedCategoryId"
                    v-model:selectedCustomCategoryId="selectedCustomCategoryId"
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
                      :max="today"
                    />
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </div>

        <!-- Mobile/Editing layout -->
        <v-container v-else class="expense-page" max-width="600">
          <!-- Amount Input -->
          <div class="amount-section">
            <ExpenseAmountInput
              :expense-id="editingExpenseId"
              :amount="initialAmount"
              :show-header="true"
              :isInputMode="isMobile ? mobileStep === 1 : true"
              @submit="handleSubmit"
              @cancel="handleCancel"
              @amount-change="handleAmountChange"
            />
          </div>

          <!-- Mobile Step 2: Show additional fields after creating expense -->
          <div
            v-if="isMobile && mobileStep === 2 && !isEditing"
            class="additional-section"
          >
            <v-card rounded="xl" elevation="0" class="additional-fields-card">
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-medium mb-2">
                  Дополнительно
                </div>

                <div class="d-flex flex-column ga-4">
                  <CategoryPicker
                    v-model:selectedCategoryId="selectedCategoryId"
                    v-model:selectedCustomCategoryId="selectedCustomCategoryId"
                  />

                  <v-date-input
                    v-model="paymentDate"
                    label="Дата платежа"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hide-actions
                    hide-details
                    input-format="yyyy.mm.dd"
                    class="custom-text-field"
                    color="primary"
                    prepend-icon="mdi-calendar"
                    :max="today"
                  />

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
              </v-card-text>
            </v-card>
          </div>

          <!-- Editing mode: Show additional fields on both mobile and desktop -->
          <div v-if="isEditing" class="additional-section">
            <v-card rounded="xl" elevation="0" class="additional-fields-card">
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-medium mb-4">
                  Дополнительно
                </div>

                <CategoryPicker
                  v-model:selectedCategoryId="selectedCategoryId"
                  v-model:selectedCustomCategoryId="selectedCustomCategoryId"
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
                    :max="today"
                  />
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-container>
      </div>

      <div class="fixed-bottom-panel">
        <v-container
          class="pa-0"
          :max-width="!isMobile && !isEditing ? '1200' : undefined"
        >
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
              @click="handleSubmit"
            >
              {{ getButtonText }}
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
  padding-top: 16px;
  padding-bottom: 140px;
}

.fixed-bottom-panel {
  position: fixed;
  right: 0;
  bottom: 56px;
  left: 0;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.8) 100%
  );
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 0;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 1005;
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

.amount-section {
  width: 100%;
}

.additional-section {
  width: 100%;
  margin-top: 16px;
}

/* Desktop layout */
@media (min-width: 961px) {
  .desktop-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
  }

  .desktop-header {
    text-align: center;
    margin-top: 32px;
    margin-bottom: 32px;
  }

  .desktop-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }

  .amount-section,
  .additional-section {
    min-width: 0;
    width: 100%;
  }

  .additional-fields-card {
    min-width: 0;
  }

  .additional-fields-card :deep(.v-card-text) {
    min-width: 0;
  }

  .scrollable-content {
    padding-bottom: 100px;
  }

  .fixed-bottom-panel {
    position: static;
    background: transparent;
    border-top: none;
    padding: 24px 0;
    backdrop-filter: none;
  }

  .fixed-bottom-panel .v-container {
    max-width: 1200px;
  }

  .button-container {
    padding: 0;
  }

  .submit-button {
    max-width: 300px;
    margin: 0 auto;
  }
}

@media (max-width: 600px) {
  .amount {
    font-size: 46px;
  }

  .scrollable-content {
    padding-top: 12px;
    padding-bottom: 120px;
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

  .additional-section {
    margin-top: 12px;
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

  .scrollable-content {
    padding-top: 8px;
    padding-bottom: 100px;
  }
}

/* Short viewport handling */
@media (max-height: 600px) and (max-width: 600px) {
  .scrollable-content {
    padding-top: 8px;
    padding-bottom: 100px;
  }

  .fixed-bottom-panel {
    padding: 8px 0;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }

  .button-container {
    padding: 0 8px;
  }

  .submit-button {
    min-height: 48px;
    font-size: 14px;
  }

  .additional-section {
    margin-top: 8px;
  }
}
</style>
