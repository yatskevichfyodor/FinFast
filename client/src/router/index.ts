import { createRouter, createWebHistory } from 'vue-router'
import ExpenseAmountInput from '@/views/ExpenseAmountInput.vue'
import ExpenseHistory from '@/views/ExpenseHistory.vue'
import StatisticsView from '@/views/Statistics.vue'
import ExpenseCategoryPicker from '@/views/ExpenseCategoryPicker.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: 'home',
      path: '/',
      component: ExpenseAmountInput
    },
    {
      name: 'ExpenseAmountInput',
      path: '/add-expense',
      component: ExpenseAmountInput
    },
    {
      name: 'ExpenseCategoryPicker',
      path: '/category-selection',
      component: ExpenseCategoryPicker
    },
    {
      name: 'ExpenseHistory',
      path: '/expense-history',
      component: ExpenseHistory
    },
    {
      name: 'StatisticsView',
      path: '/statistics',
      component: StatisticsView
    }
  ]
})

export default router