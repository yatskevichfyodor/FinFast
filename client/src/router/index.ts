import { createRouter, createWebHistory } from 'vue-router'
import ExpenseFormView from '@/views/ExpenseFormView.vue'
import ExpenseHistoryView from '@/views/ExpenseHistoryView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import AuthView from '@/views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'home',
      path: '/',
      component: ExpenseFormView,
      meta: { requiresAuth: true }
    },
    {
      name: 'add',
      path: '/add',
      component: ExpenseFormView,
      meta: { requiresAuth: true }
    },
    {
      name: 'expense-payment-form',
      path: '/edit',
      component: ExpenseFormView,
      meta: { requiresAuth: true }
    },
    {
      name: 'expense-history',
      path: '/expense-history',
      component: ExpenseHistoryView,
      meta: { requiresAuth: true }
    },
    {
      name: 'StatisticsView',
      path: '/statistics',
      component: StatisticsView,
      meta: { requiresAuth: true }
    },
    {
      name: 'login',
      path: '/login',
      component: AuthView
    },
    {
      name: 'register',
      path: '/register',
      component: AuthView
    }
  ]
})

router.beforeEach(to => {
  const isAuthenticated = localStorage.getItem('finfast-access-token') !== null || (
    localStorage.getItem('finfast-offline-mode') === 'true' &&
    localStorage.getItem('finfast-user-id') !== null
  ) || localStorage.getItem('finfast-anonymous-profile') !== null &&
    localStorage.getItem('finfast-offline-mode') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    return { name: 'home' }
  }
})

export default router