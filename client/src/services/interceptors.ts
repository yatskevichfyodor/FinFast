import { authApi, expenseApi } from '@/services/http'
import router from '@/router'
import { refresh as refreshAuthTokens, type TokenResponse } from '@/services/authApi'

const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'

const clients = [authApi, expenseApi]

clients.forEach(client => {
  client.interceptors.request.use(config => {
    if (isPublicAuthRequest(config.url ?? '')) {
      return config
    }

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  })
})


let refreshPromise: Promise<TokenResponse> | null = null

async function refreshTokens(): Promise<TokenResponse> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

  if (!refreshToken) {
    throw new Error('Refresh token is missing')
  }

  if (!refreshPromise) {
    refreshPromise = refreshAuthTokens(refreshToken)
      .then(tokens => {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)

        return tokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function isPublicAuthRequest(url: string): boolean {
  return url === '/auth/login' || url === '/auth/register' || url === '/auth/refresh' || url === '/auth/google'
}

function redirectToLogin() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)

  void router.replace({
    name: 'login',
    query: {
      redirect: router.currentRoute.value.fullPath
    }
  })
}

clients.forEach(client => {
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

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

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
})

console.log('API INTERCEPTORS INITIALIZED')
