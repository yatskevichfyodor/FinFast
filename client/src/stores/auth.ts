import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'

const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'
const USER_ID_KEY = 'finfast-user-id'
const USERNAME_KEY = 'finfast-username'

interface TokenClaims {
  sub?: string
  userId?: string
  username?: string
  preferred_username?: string
  name?: string
}

function readTokenClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='))
    return JSON.parse(decodedPayload) as TokenClaims
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))
  const userId = ref<string | null>(localStorage.getItem(USER_ID_KEY))
  const username = ref<string | null>(localStorage.getItem(USERNAME_KEY))

  function restoreUserFromToken(token: string | null) {
    const claims = token ? readTokenClaims(token) : null
    userId.value = claims?.userId || claims?.sub || userId.value
    username.value = claims?.username || claims?.preferred_username || claims?.name || username.value
  }

  restoreUserFromToken(accessToken.value)

  const isAuthenticated = computed(() => accessToken.value !== null)

  function saveTokens(tokens: authApi.TokenResponse) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    restoreUserFromToken(tokens.accessToken)
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
      userId.value = null
      username.value = null
      return
    }

    try {
      const user = await authApi.me()
      userId.value = user.id
      username.value = user.username
      localStorage.setItem(USER_ID_KEY, user.id)
      localStorage.setItem(USERNAME_KEY, user.username)
    } catch (error) {
      console.warn('Failed to load current user, using token claims:', error)
    }
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
    userId.value = null
    username.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
    localStorage.removeItem(USERNAME_KEY)

    if (currentRefreshToken) {
      await authApi.logout(currentRefreshToken)
    }
  }

  return {
    accessToken,
    userId,
    username,
    isAuthenticated,
    register,
    login,
    loadCurrentUser,
    refresh,
    logout
  }
})
