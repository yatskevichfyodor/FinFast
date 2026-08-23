<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMonthName } from '@/utils/dateHelpers'

interface CategoryStat {
  id: number
  name: string
  icon: string
  color: string
  amount: number
}

interface MonthStat {
  year: number
  month: number
  categories: CategoryStat[]
}

const months = ref<MonthStat[]>([
  {
    year: 2026,
    month: 8,
    categories: [
      {
        id: 1,
        name: 'Еда',
        icon: 'mdi-food',
        color: '#FF7043',
        amount: 520
      },
      {
        id: 2,
        name: 'Транспорт',
        icon: 'mdi-car',
        color: '#42A5F5',
        amount: 190
      },
      {
        id: 3,
        name: 'Дом',
        icon: 'mdi-home',
        color: '#AB47BC',
        amount: 150
      },
      {
        id: 4,
        name: 'Покупки',
        icon: 'mdi-shopping',
        color: '#EC407A',
        amount: 280
      },
      {
        id: 5,
        name: 'Развлечения',
        icon: 'mdi-gamepad-variant',
        color: '#7E57C2',
        amount: 65
      },
      {
        id: 6,
        name: 'Здоровье',
        icon: 'mdi-heart-pulse',
        color: '#26A69A',
        amount: 40
      }
    ]
  },
  {
    year: 2026,
    month: 7,
    categories: [
      {
        id: 1,
        name: 'Еда',
        icon: 'mdi-food',
        color: '#FF7043',
        amount: 430
      },
      {
        id: 2,
        name: 'Транспорт',
        icon: 'mdi-car',
        color: '#42A5F5',
        amount: 160
      },
      {
        id: 3,
        name: 'Дом',
        icon: 'mdi-home',
        color: '#AB47BC',
        amount: 210
      },
      {
        id: 4,
        name: 'Покупки',
        icon: 'mdi-shopping',
        color: '#EC407A',
        amount: 320
      }
    ]
  }
])

const selectedMonthIndex = ref(0)

const currentMonth = computed(() => {
  return months.value[selectedMonthIndex.value]!
})

const totalAmount = computed(() => {
  return currentMonth.value.categories.reduce(
    (total, category) => total + category.amount,
    0
  )
})

const formattedTotal = computed(() => {
  return totalAmount.value.toFixed(2)
})

const monthName = computed(() => {
  return formatMonthName(currentMonth.value.year, currentMonth.value.month)
})

const sortedCategories = computed(() => {
  return [...currentMonth.value.categories]
    .sort((a, b) => b.amount - a.amount)
})

function previousMonth() {
  if (selectedMonthIndex.value < months.value.length - 1) {
    selectedMonthIndex.value++
  }
}

function nextMonth() {
  if (selectedMonthIndex.value > 0) {
    selectedMonthIndex.value--
  }
}

function getPercentage(amount: number) {
  if (!totalAmount.value) {
    return 0
  }

  return Math.round(
    (amount / totalAmount.value) * 100
  )
}
</script>

<template>
  <v-main class="statistics-page">
    <v-container
      max-width="700"
      class="py-8"
    >
      <!-- Header -->
      <div class="mb-6">
        <div class="text-h5 font-weight-bold">
          Статистика
        </div>

        <div class="text-body-2 text-medium-emphasis mt-1">
          Анализ ваших расходов
        </div>
      </div>

      <!-- Month selector -->
      <v-card
        rounded="xl"
        elevation="0"
        class="month-selector mb-5"
      >
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
      <v-card
        rounded="xl"
        elevation="0"
        class="total-card mb-6"
      >
        <v-card-text class="pa-6">

          <div class="total-label">
            Всего расходов
          </div>

          <div class="total-amount">
            {{ formattedTotal }}
            <span>₾</span>
          </div>

          <div class="total-caption">
            за {{ monthName }}
          </div>

        </v-card-text>
      </v-card>

      <!-- Categories -->
      <div class="section-title mb-3">
        По категориям
      </div>

      <div class="category-list">

        <v-card
          v-for="category in sortedCategories"
          :key="category.id"
          rounded="xl"
          elevation="0"
          class="category-card mb-3"
        >
          <v-card-text class="pa-4">

            <div class="d-flex align-center">

              <!-- Icon -->
              <div
                class="category-icon"
                :style="{
                  '--category-color': category.color
                }"
              >
                <v-icon
                  :icon="category.icon"
                  size="23"
                />
              </div>

              <!-- Name -->
              <div class="category-info">

                <div class="d-flex justify-space-between">
                  <span class="category-name">
                    {{ category.name }}
                  </span>

                  <span class="category-amount">
                    {{ category.amount.toFixed(2) }} ₾
                  </span>
                </div>

                <!-- Progress -->
                <v-progress-linear
                  :model-value="getPercentage(category.amount)"
                  :color="category.color"
                  height="7"
                  rounded
                  class="mt-2"
                />

                <div class="percentage">
                  {{ getPercentage(category.amount) }}%
                </div>

              </div>

            </div>

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

          <div class="text-h6 mt-3">
            Нет расходов
          </div>

          <div class="text-body-2 text-medium-emphasis mt-1">
            За этот месяц пока нет данных
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
  background: linear-gradient(
    135deg,
    #e8f5e9,
    #e0f2f1
  );
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
}

.category-card:hover {
  transform: translateY(-2px);

  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.06);
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

  background: color-mix(
    in srgb,
    var(--category-color) 10%,
    white
  );
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

.percentage {
  margin-top: 4px;

  font-size: 12px;
  color: #90a4ae;
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