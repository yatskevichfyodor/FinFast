import { createApp, watch } from 'vue'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@/services/interceptors.ts'
import { initializePwaUpdate } from '@/services/pwaUpdate'

import './style.css'
import './styles/common.css'
import { pinia } from './stores/index.ts'
import { createNotivue } from 'notivue'
import { i18n } from '@/i18n'
import 'notivue/notification.css'
import 'notivue/animations.css'

const app = createApp(App)

app.use(router)
app.use(vuetify)
app.use(pinia)
app.use(i18n)
watch(i18n.global.locale, (locale) => {
  vuetify.locale.current.value = locale
})
app.use(createNotivue({
  notifications: {
    global: {
      duration: Infinity,
    },
  },
}))

initializePwaUpdate()
app.mount('#app')