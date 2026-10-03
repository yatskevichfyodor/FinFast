import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@/services/interceptors.ts'
import { initializePwaUpdate } from '@/services/pwaUpdate'

import './style.css'
import './styles/common.css'
import { pinia } from './stores/index.ts'

const app = createApp(App)

app.use(router)
app.use(vuetify)
app.use(pinia)

initializePwaUpdate()
app.mount('#app')