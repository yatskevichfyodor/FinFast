import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import baseConfig from './vite.config.ts'

export default defineConfig(async (env) => {
  const config =
    typeof baseConfig === 'function'
      ? await baseConfig(env)
      : baseConfig

  return {
    ...config,
    server: {
      ...config.server,
      host: '0.0.0.0',
      port: 5273,
      strictPort: true,
      https: {
        cert: readFileSync('../certs/finfast-local.pem'),
        key: readFileSync('../certs/finfast-local-key.pem'),
      },
    },
  }
})