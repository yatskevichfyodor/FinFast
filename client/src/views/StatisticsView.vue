<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { formatMonthName, parseDate } from "@/utils/dateHelpers";
import { useCategoryStore, useExpenseStore } from "@/stores";
import type { Expense } from "@/types/expense";
import { useI18n } from "vue-i18n";
import { useCurrencyStore } from "@/stores/currencyStore";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, formatCurrencyAmount, type CurrencyCode } from "@/types/currency";
import CurrencyAmount from "@/components/CurrencyAmount.vue";
import CurrencySymbol from "@/components/CurrencySymbol.vue";

interface CurrencyAmount {
  currency: CurrencyCode;
  amount: number;
}

interface CategoryStat {
  id: string;
  name: string;
  icon: string;
  color: string;
  amounts: CurrencyAmount[];
}

interface MonthStat {
  year: number;
  month: number;
  totals: CurrencyAmount[];
  categories: CategoryStat[];
}

const expenseStore = useExpenseStore().value!;
const categoryStore = useCategoryStore().value!;
const currencyStore = useCurrencyStore();
const { t, locale } = useI18n();

onMounted(() => {
  void expenseStore.refreshExpenses();
});

const selectedMonthIndex = ref(0);
const expandedCategoryId = ref<string | null>(null);

const activeExpenses = computed(() =>
  expenseStore.expenses.filter((expense) => !expense.deletedAt),
);

const months = computed<MonthStat[]>(() => {
  const monthGroups = new Map<
    string,
    {
      year: number;
      month: number;
      categories: Map<string, Map<CurrencyCode, number>>;
    }
  >();

  activeExpenses.value.forEach((expense) => {
    const date = parseDate(expense.paymentDate ?? expense.createdAt);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const categoryId = expense.customCategoryId ?? expense.categoryId ?? "__uncategorized__";
    const group = monthGroups.get(monthKey) ?? {
      year,
      month,
      categories: new Map<string, Map<CurrencyCode, number>>(),
    };
    const currency = expense.currency ?? DEFAULT_CURRENCY;
    const categoryTotals = group.categories.get(categoryId) ?? new Map<CurrencyCode, number>();
    categoryTotals.set(currency, (categoryTotals.get(currency) ?? 0) + expense.amount);
    group.categories.set(categoryId, categoryTotals);
    monthGroups.set(monthKey, group);
  });

  return [...monthGroups.values()]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((group) => {
      const totals = new Map<CurrencyCode, number>();
      const categories = [...group.categories.entries()].map(([id, currencyTotals]) => {
        currencyTotals.forEach((amount, currency) => {
          totals.set(currency, (totals.get(currency) ?? 0) + amount);
        });
        const category =
          id === "__uncategorized__"
            ? categoryStore.getCategoryDisplay(undefined)
            : categoryStore.getCategoryDisplay(id);

        return {
          id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          amounts: CURRENCY_OPTIONS.flatMap(({ code }) => {
            const amount = currencyTotals.get(code);
            return amount === undefined ? [] : [{ currency: code, amount }];
          }),
        };
      });
      return {
        year: group.year,
        month: group.month,
        totals: CURRENCY_OPTIONS.flatMap(({ code }) => {
          const amount = totals.get(code);
          return amount === undefined ? [] : [{ currency: code, amount }];
        }),
        categories,
      };
    });
});

watch(months, (value) => {
  if (selectedMonthIndex.value >= value.length) {
    selectedMonthIndex.value = Math.max(value.length - 1, 0);
  }
});

const currentMonth = computed(() => months.value[selectedMonthIndex.value]);

const monthName = computed(() => {
  if (!currentMonth.value) {
    return t("stats.noData");
  }

  return formatMonthName(
    currentMonth.value.year,
    currentMonth.value.month,
    locale.value === "ru" ? "ru" : "en",
  );
});

const sortedCategories = computed(() => {
  return [...(currentMonth.value?.categories ?? [])].sort(
    (a, b) =>
      (b.amounts.find((amount) => amount.currency === currencyStore.currency)?.amount ?? 0) -
      (a.amounts.find((amount) => amount.currency === currencyStore.currency)?.amount ?? 0) ||
      a.name.localeCompare(b.name),
  );
});

function previousMonth() {
  if (selectedMonthIndex.value < months.value.length - 1) {
    selectedMonthIndex.value++;
  }
}

function nextMonth() {
  if (selectedMonthIndex.value > 0) {
    selectedMonthIndex.value--;
  }
}

function getPercentage(amount: number, currency: CurrencyCode) {
  const total = currentMonth.value?.totals.find((item) => item.currency === currency)?.amount ?? 0;
  if (!total) {
    return 0;
  }

  return Math.round((amount / total) * 100);
}

function getExpenseCategoryId(expense: Expense): string {
  return expense.customCategoryId ?? expense.categoryId ?? "__uncategorized__";
}

function getCategoryExpenses(categoryId: string): Expense[] {
  if (!currentMonth.value) {
    return [];
  }

  return activeExpenses.value
    .filter((expense) => {
      const date = parseDate(expense.paymentDate ?? expense.createdAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === currentMonth.value!.year &&
        date.getMonth() + 1 === currentMonth.value!.month &&
        getExpenseCategoryId(expense) === categoryId
      );
    })
    .sort((a, b) => {
      const dateDifference =
        parseDate(b.paymentDate ?? b.createdAt).getTime() -
        parseDate(a.paymentDate ?? a.createdAt).getTime();
      return dateDifference || parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
    });
}

function toggleCategory(categoryId: string) {
  expandedCategoryId.value =
    expandedCategoryId.value === categoryId ? null : categoryId;
}

function formatExpenseDate(expense: Expense): string {
  return parseDate(expense.paymentDate ?? expense.createdAt).toLocaleDateString(
    locale.value === "ru" ? "ru-RU" : "en-US",
    { day: "numeric", month: "long" },
  );
}
</script>

<template>
  <v-main class="statistics-page">
    <v-container max-width="700" class="py-8">
      <!-- Header -->
      <div class="mb-6">
        <div class="text-h5 font-weight-bold">{{ t("stats.title") }}</div>

        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ t("stats.subtitle") }}
        </div>
      </div>

      <!-- Month selector -->
      <v-card rounded="xl" elevation="0" class="month-selector mb-5">
        <v-card-text class="d-flex align-center justify-space-between pa-3">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            :disabled="selectedMonthIndex >= months.length - 1"
            @click="previousMonth"
          />

          <div class="month-name">
            {{ monthName }}
          </div>

          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            :disabled="selectedMonthIndex <= 0"
            @click="nextMonth"
          />
        </v-card-text>
      </v-card>

      <!-- Total -->
      <v-card rounded="xl" elevation="0" class="total-card mb-6">
        <v-card-text class="pa-6">
          <div class="total-label">{{ t("stats.total") }}</div>

          <div v-if="currentMonth?.totals.length" class="total-amount-list">
            <div v-for="total in currentMonth.totals" :key="total.currency" class="total-amount">
              <CurrencyAmount :amount="total.amount" :currency="total.currency" :symbol-size="18" />
            </div>
          </div>
          <div v-else class="total-amount">—</div>

          <div class="total-caption">{{ t("stats.forMonth") }} {{ monthName }}</div>
        </v-card-text>
      </v-card>

      <!-- Categories -->
      <div class="section-title mb-3">{{ t("stats.categories") }}</div>

      <div class="category-list">
        <v-card
          v-for="category in sortedCategories"
          :key="category.id"
          rounded="xl"
          elevation="0"
          class="category-card mb-3"
          role="button"
          tabindex="0"
          :aria-expanded="expandedCategoryId === category.id"
          :aria-label="`${category.name}: ${category.amounts.map(({ amount, currency }) => formatCurrencyAmount(amount, currency)).join(' + ')}`"
          @click="toggleCategory(category.id)"
          @keydown.enter.prevent="toggleCategory(category.id)"
          @keydown.space.prevent="toggleCategory(category.id)"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <!-- Icon -->
              <div
                class="category-icon"
                :style="{
                  '--category-color': category.color,
                }"
              >
                <v-icon :icon="category.icon" size="23" />
              </div>

              <!-- Name -->
              <div class="category-info">
                <div class="d-flex justify-space-between">
                  <span class="category-name">
                    {{ category.name }}
                  </span>

                  <div class="category-currency-amounts">
                    <span v-for="amount in category.amounts" :key="amount.currency" class="category-amount">
                      <CurrencyAmount :amount="amount.amount" :currency="amount.currency" :symbol-size="13" />
                    </span>
                  </div>
                </div>

                <!-- Progress -->
                <div v-for="amount in category.amounts" :key="amount.currency" class="category-currency-progress">
                  <v-progress-linear
                    :model-value="getPercentage(amount.amount, amount.currency)"
                    :color="category.color"
                    height="7"
                    rounded
                    class="mt-2"
                  />
                  <div class="percentage">
                    {{ getPercentage(amount.amount, amount.currency) }}%
                  </div>
                </div>
              </div>

              <v-icon
                :icon="expandedCategoryId === category.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                class="category-expand-indicator ml-2"
                aria-hidden="true"
              />
            </div>

            <v-expand-transition>
              <div
                v-if="expandedCategoryId === category.id"
                class="category-expenses"
                @click.stop
              >
                <div
                  v-for="expense in getCategoryExpenses(category.id)"
                  :key="expense.id"
                  class="category-expense-row"
                  :style="{ '--category-color': category.color }"
                >
                  <div class="category-expense-details">
                    <div class="category-expense-topline">
                      <span class="category-expense-date">
                        <v-icon icon="mdi-calendar-blank-outline" size="14" />
                        {{ formatExpenseDate(expense) }}
                      </span>
                      <span class="category-expense-amount">
                        <CurrencyAmount :amount="expense.amount" :currency="expense.currency ?? DEFAULT_CURRENCY" :symbol-size="13" />
                      </span>
                      <span v-if="expense.description" class="category-expense-description">
                        {{ expense.description }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </v-expand-transition>
          </v-card-text>
        </v-card>
      </div>

      <!-- Empty state -->
      <v-card
        v-if="!sortedCategories.length"
        rounded="xl"
        elevation="0"
        class="empty-state"
      >
        <v-card-text class="text-center py-10">
          <v-icon
            icon="mdi-chart-box-outline"
            size="52"
            color="medium-emphasis"
          />

          <div class="text-h6 mt-3">{{ t("stats.empty") }}</div>

          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ t("stats.emptyHint") }}
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped>
/* Month */

.month-selector {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.month-name {
  font-size: 16px;
  font-weight: 600;
  text-transform: capitalize;
}

/* Total */

.total-card {
  background: linear-gradient(135deg, #e8f5e9, #e0f2f1);
}

.total-label {
  font-size: 14px;
  font-weight: 500;
  color: #607d8b;
}

.total-amount {
  margin-top: 6px;

  font-size: 42px;
  line-height: 1.1;
  font-weight: 700;

  color: #263238;
}

.total-amount-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.total-amount-list .total-amount {
  font-size: 32px;
}

.total-amount-list .total-amount:not(:first-child)::before {
  content: "+";
  margin-right: 12px;
  color: #607d8b;
  font-size: 22px;
}

.total-amount span {
  font-size: 23px;
  color: #546e7a;
}

.total-caption {
  margin-top: 6px;

  font-size: 13px;
  color: #78909c;

  text-transform: capitalize;
}

/* Categories */

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.category-card {
  background: rgb(var(--v-theme-surface));

  border: 1px solid rgba(0, 0, 0, 0.05);

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  cursor: pointer;
}

.category-card:hover {
  transform: translateY(-2px);

  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}

.category-icon {
  flex-shrink: 0;

  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 15px;

  color: var(--category-color);

  background: color-mix(in srgb, var(--category-color) 10%, white);
}

.category-info {
  flex: 1;
  min-width: 0;

  margin-left: 14px;
}

.category-name {
  font-size: 15px;
  font-weight: 600;
}

.category-amount {
  font-size: 15px;
  font-weight: 600;
}

.category-currency-amounts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.category-currency-progress {
  margin-top: 6px;
}

.percentage {
  margin-top: 4px;

  font-size: 12px;
  color: #90a4ae;
}

.category-expand-indicator {
  flex-shrink: 0;
  color: #90a4ae;
}

.category-expenses {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.category-expense-row {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 10px 14px;
  border-left: 3px solid var(--category-color);
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--category-color) 5%,
    rgb(var(--v-theme-surface))
  );
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.category-expense-row:hover {
  transform: translateX(2px);
  background: color-mix(
    in srgb,
    var(--category-color) 9%,
    rgb(var(--v-theme-surface))
  );
}

.category-expense-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
}

.category-expense-topline {
  display: grid;
  grid-template-columns: 60% 40%;
  align-items: center;
  gap: 8px;
}

.category-expense-date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #3f535c;
  font-size: 12px;
  font-weight: 550;
  white-space: nowrap;
}

.category-expense-description {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #546e7a;
  font-size: 13px;
  font-weight: 550;
  margin-left: 20px;
}

.category-expense-amount {
  flex-shrink: 0;
  text-align: center;
  color: rgb(var(--v-theme-on-surface));
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

/* Empty */

.empty-state {
  border: 1px dashed #cfd8dc;
}

/* Mobile */

@media (max-width: 600px) {
  .statistics-page {
    padding-bottom: 20px;
  }

  .total-amount {
    font-size: 36px;
  }

  .category-amount {
    font-size: 14px;
  }
}
</style>
