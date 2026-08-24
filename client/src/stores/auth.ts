import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'

const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))
  const username = ref<string | null>(null)

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

  async function login(loginUsername: string, password: string) {
    const tokens = await authApi.login({ username: loginUsername, password })
    saveTokens(tokens)
    await loadCurrentUser()
  }

  async function loadCurrentUser() {
    if (!accessToken.value) {
      username.value = null
      return
    }

    const user = await authApi.me()
    username.value = user.username
  }

  async function refresh() {
    if (!refreshToken.value) {
      throw new Error('Refresh token is missing')
    }

    saveTokens(await authApi.refresh(refreshToken.value))
    await loadCurrentUser()
  }

  async function logout() {
    const currentRefreshToken = refreshToken.value
    accessToken.value = null
    refreshToken.value = null
    username.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)

    if (currentRefreshToken) {
      await authApi.logout(currentRefreshToken)
    }
  }

  return {
    accessToken,
    username,
    isAuthenticated,
    register,
    login,
    loadCurrentUser,
    refresh,
    logout
  }
})
