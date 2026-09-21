import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { createPinia } from 'pinia'
import '@/services/interceptors.ts'
import { initializePwaUpdate } from '@/services/pwaUpdate'
import { buildPopularCategoryOrder } from '@/services/categoryPopularity'
import { useExpenseStore } from '@/stores/expense'

import './style.css'
import './styles/common.css'

const app = createApp(App)

app.use(router)
app.use(vuetify)
app.use(createPinia())

const expenseStore = useExpenseStore()
buildPopularCategoryOrder(expenseStore.expenses)

initializePwaUpdate()
app.mount('#app')