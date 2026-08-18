import { createRouter, createWebHistory } from 'vue-router'
import ExpenseAmountInputView from '@/views/ExpenseAmountInputView.vue'
import ExpenseHistoryView from '@/views/ExpenseHistoryView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import ExpenseCategorySelectionView from '@/views/ExpenseCategorySelectionView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: 'home',
      path: '/',
      component: ExpenseAmountInputView
    },
    {
      name: 'ExpenseAmountInputView',
      path: '/amount-input',
      component: ExpenseAmountInputView
    },
    {
      name: 'ExpenseCategorySelectionView',
      path: '/category-selection',
      component: ExpenseCategorySelectionView
    },
    {
      name: 'ExpenseHistoryView',
      path: '/expense-history',
      component: ExpenseHistoryView
    },
    {
      name: 'StatisticsView',
      path: '/statistics',
      component: StatisticsView
    }
  ]
})

export default router