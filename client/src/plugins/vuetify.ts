import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#2196F3',
          secondary: '#03DAC6',
          background: '#f6f8fb',
          surface: '#ffffff',
        }
      },
      dark: {
        colors: {
          primary: '#4FC3F7',
          secondary: '#03DAC6',
          background: '#121212',
          surface: '#1E1E1E',
        }
      }
    }
  }
})