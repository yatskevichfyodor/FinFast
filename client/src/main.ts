import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@/services/interceptors.ts'
import { initializePwaUpdate } from '@/services/pwaUpdate'
import { buildPopularCategoryOrder } from '@/services/categoryPopularity'
import { useExpenseStore } from '@/stores/expenseStore.ts'

import './style.css'
import './styles/common.css'
import { useDataChangesStore } from './stores/dataChangesStore.ts'
import { useCategoryStore } from './stores/categoryStore.ts'
import { pinia } from './stores/index.ts'

const app = createApp(App)

app.use(router)
app.use(vuetify)
app.use(pinia)

const dataChangesStore = useDataChangesStore(pinia)
await dataChangesStore.init()
const expenseStore = useExpenseStore(pinia)
const categoryStore = useCategoryStore(pinia)
await categoryStore.init();
buildPopularCategoryOrder(expenseStore.expenses)

initializePwaUpdate()
app.mount('#app')