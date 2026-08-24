import { createRouter, createWebHistory } from 'vue-router'
import ExpenseAmountInputView from '@/views/ExpenseAmountInputView.vue'
import ExpenseHistoryView from '@/views/ExpenseHistoryView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import ExpenseCategorySelectionView from '@/views/ExpenseCategorySelectionView.vue'
import AuthView from '@/views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: 'home',
      path: '/',
      component: ExpenseAmountInputView,
      meta: { requiresAuth: true }
    },
    {
      name: 'add',
      path: '/add',
      component: ExpenseAmountInputView,
      meta: { requiresAuth: true }
    },
    {
      name: 'ExpenseAmountInputView',
      path: '/edit',
      component: ExpenseAmountInputView,
      meta: { requiresAuth: true }
    },
    {
      name: 'ExpenseCategorySelectionView',
      path: '/category-selection',
      component: ExpenseCategorySelectionView,
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
  const isAuthenticated = localStorage.getItem('finfast-access-token') !== null

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if ((to.name === 'login' || to.name === 'register') && isAuthenticated) {
    return { name: 'home' }
  }
})

export default router