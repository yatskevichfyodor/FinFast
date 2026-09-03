import axios from 'axios'
import router from '@/router'
import { refresh } from './authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
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

export const api = axios.create({
  baseURL: API_BASE_URL
})

api.interceptors.request.use(config => {
  const accessToken = localStorage.getItem('finfast-access-token')

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const requestUrl = error.config?.url ?? ''
    const isLoginOrRegisterRequest = requestUrl === '/auth/login' || requestUrl === '/auth/register' || requestUrl === '/auth/refresh'

    if (error.response?.status === 401 && !isLoginOrRegisterRequest && router.currentRoute.value.name !== 'login') {
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
          const { accessToken } = await refresh(refreshToken)
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          onRefreshed(accessToken)

          error.config.headers.Authorization = `Bearer ${accessToken}`
          return api.request(error.config)
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
      } else {
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            error.config.headers.Authorization = `Bearer ${token}`
            resolve(api.request(error.config))
          })
        })
      }
    }

    return Promise.reject(error)
  }
)
