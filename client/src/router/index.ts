import { createRouter, createWebHistory } from 'vue-router'
import AddExpenseView from '@/views/AddExpenseView.vue'
import ExpensesHistory from '@/views/ExpensesHistory.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AddExpenseView
    },
    {
      path: '/expenses',
      component: ExpensesHistory
    },
    {
      path: '/statistics',
      component: StatisticsView
    }
  ]
})

export default router