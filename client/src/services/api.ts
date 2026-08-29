import axios from 'axios'
import router from '@/router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'

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
  error => {
    const requestUrl = error.config?.url ?? ''
    const isLoginOrRegisterRequest = requestUrl === '/auth/login' || requestUrl === '/auth/register'

    if (error.response?.status === 401 && !isLoginOrRegisterRequest && router.currentRoute.value.name !== 'login') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)

      void router.replace({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath }
      })
    }

    return Promise.reject(error)
  }
)
