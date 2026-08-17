import { createRouter, createWebHistory } from 'vue-router'
import ExpenseView from '../views/ExpenseView.vue'
import ExpensesHistory from '@/components/ExpensesHistory.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: ExpenseView
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