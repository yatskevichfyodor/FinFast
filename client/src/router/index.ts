import { createRouter, createWebHistory } from 'vue-router'
import ExpenseView from '../views/ExpenseView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: ExpenseView
    }
  ]
})

export default router