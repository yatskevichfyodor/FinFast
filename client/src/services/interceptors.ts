import { authApi, expenseApi } from '@/services/api/http'
import router from '@/router'
import { refresh as refreshAuthTokens, type TokenResponse } from '@/services/api/authApi'
import tokenStorage from '@/stores/tokenStorage'
import type { AxiosInstance } from 'axios'

const clients = [authApi, expenseApi]


let refreshPromise: Promise<TokenResponse> | null = null

async function refreshTokens(): Promise<TokenResponse> {
  const refreshToken = tokenStorage.getRefreshToken()

  if (!refreshToken) {
    throw new Error('Refresh token is missing')
  }

  if (!refreshPromise) {
    refreshPromise = refreshAuthTokens(refreshToken)
      .then(tokens => {
        tokenStorage.save(tokens.accessToken, tokens.refreshToken)

        return tokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

const PUBLIC_AUTH_REQUESTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/google'
])

function isPublicAuthRequest(url: string): boolean {
  return PUBLIC_AUTH_REQUESTS.has(url)
}

function redirectToLogin() {
  tokenStorage.clear()

  void router.replace({
    name: 'login',
    query: {
      redirect: router.currentRoute.value.fullPath
    }
  })
}

function setupRequestInterceptor(client: AxiosInstance) {
  client.interceptors.request.use(config => {
    if (isPublicAuthRequest(config.url ?? '')) {
      return config
    }

    const accessToken = tokenStorage.getAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  })
}

function setupResponseInterceptor(client: AxiosInstance) {
  client.interceptors.response.use(
    response => response,

    async error => {
      const requestUrl = error.config?.url ?? ''
      const isRetry = error.config?._finfastRetry === true

      if (
        error.response?.status !== 401 ||
        isPublicAuthRequest(requestUrl) ||
        isRetry
      ) {
        return Promise.reject(error)
      }

      const refreshToken = tokenStorage.getRefreshToken()

      if (!refreshToken) {
        redirectToLogin()
        return Promise.reject(error)
      }

      try {
        const tokens = await refreshTokens()

        error.config._finfastRetry = true
        error.config.headers.Authorization = `Bearer ${tokens.accessToken}`

        return client.request(error.config)
      } catch (refreshError) {
        redirectToLogin()
        return Promise.reject(refreshError)
      }
    }
  )
}

clients.forEach(client => {
  setupRequestInterceptor(client)
  setupResponseInterceptor(client)
})
console.log('API INTERCEPTORS INITIALIZED')
