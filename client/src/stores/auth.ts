import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'

const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))

  const isAuthenticated = computed(() => accessToken.value !== null)

  function saveTokens(tokens: authApi.TokenResponse) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  }

  async function register(username: string, password: string) {
    return authApi.register({ username, password })
  }

  async function login(username: string, password: string) {
    const tokens = await authApi.login({ username, password })
    saveTokens(tokens)
  }

  async function refresh() {
    if (!refreshToken.value) {
      throw new Error('Refresh token is missing')
    }

    saveTokens(await authApi.refresh(refreshToken.value))
  }

  async function logout() {
    const currentRefreshToken = refreshToken.value
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)

    if (currentRefreshToken) {
      await authApi.logout(currentRefreshToken)
    }
  }

  return {
    accessToken,
    isAuthenticated,
    register,
    login,
    refresh,
    logout
  }
})
