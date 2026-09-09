import axios from 'axios'
import router from '@/router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL
const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

export const authApi = axios.create({
  baseURL: AUTH_BASE_URL
})

export const expenseApi = axios.create({
  baseURL: API_BASE_URL
})

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

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await authApi.post<{ accessToken: string }>('/auth/refresh', { refreshToken })
  return data.accessToken
}

function isPublicAuthRequest(url: string): boolean {
  return url === '/auth/login' || url === '/auth/register' || url === '/auth/refresh'
}

clients.forEach(client => {
  client.interceptors.response.use(
    response => response,
    async error => {
      const requestUrl = error.config?.url ?? ''
      const isRetry = error.config?._finfastRetry === true

      if (error.response?.status !== 401 || isPublicAuthRequest(requestUrl) || isRetry) {
        return Promise.reject(error)
      }

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (!refreshToken) {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)

        void router.replace({
          name: 'login',
          query: { redirect: router.currentRoute.value.fullPath }
        })
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        isRefreshing = true

        try {
          const accessToken = await refreshAccessToken(refreshToken)
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          onRefreshed(accessToken)

          error.config._finfastRetry = true
          error.config.headers.Authorization = `Bearer ${accessToken}`
          return client.request(error.config)
        } catch (refreshError) {
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)

          void router.replace({
            name: 'login',
            query: { redirect: router.currentRoute.value.fullPath }
          })
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return new Promise(resolve => {
        subscribeTokenRefresh(token => {
          error.config._finfastRetry = true
          error.config.headers.Authorization = `Bearer ${token}`
          resolve(client.request(error.config))
        })
      })
    }
  )
})
