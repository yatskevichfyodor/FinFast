import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    ...(mode === 'development' ? [vueDevTools()] : []),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.png',
        'byn-symbol.webp'
      ],

      manifest: {
        name: 'FinFast',
        short_name: 'FinFast',
        description: 'Персональный трекер расходов',
        theme_color: '#4a7ba7',
        background_color: '#ffffff',
        display: 'standalone',

        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,webp,svg}'
        ],
        runtimeCaching: [
          {
            urlPattern: /^https?.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200,
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: '/FinFast/',
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: [
          'console.log',
          'console.debug',
          'console.info',
          'console.warn'
        ],
        drop_debugger: true
      }
    },
    sourcemap: false
  }
}))

