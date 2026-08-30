import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'

const ACCESS_TOKEN_KEY = 'finfast-access-token'
const REFRESH_TOKEN_KEY = 'finfast-refresh-token'
const USER_ID_KEY = 'finfast-user-id'
const USERNAME_KEY = 'finfast-username'
const OFFLINE_MODE_KEY = 'finfast-offline-mode'
const ANONYMOUS_PROFILE_KEY = 'finfast-anonymous-profile'

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
  const isOffline = ref(localStorage.getItem(OFFLINE_MODE_KEY) === 'true')
  const userId = ref<string | null>(
    accessToken.value || isOffline.value ? localStorage.getItem(USER_ID_KEY) : null
  )
  const username = ref<string | null>(
    accessToken.value || isOffline.value ? localStorage.getItem(USERNAME_KEY) : null
  )
  const isAnonymous = ref(false)

  function restoreUserFromToken(token: string | null) {
    const claims = token ? readTokenClaims(token) : null
    userId.value = claims?.userId || claims?.sub || userId.value
    username.value = claims?.username || claims?.preferred_username || claims?.name || username.value

    if (userId.value) {
      localStorage.setItem(USER_ID_KEY, userId.value)
    }
    if (username.value) {
      localStorage.setItem(USERNAME_KEY, username.value)
    }
  }

  function continueWithoutAccount() {
    const anonymousProfile = localStorage.getItem(ANONYMOUS_PROFILE_KEY) ?? crypto.randomUUID()
    localStorage.setItem(ANONYMOUS_PROFILE_KEY, anonymousProfile)
    accessToken.value = null
    refreshToken.value = null
    userId.value = `anonymous:${anonymousProfile}`
    username.value = 'Без аккаунта'
    isAnonymous.value = true
    isOffline.value = true
    localStorage.setItem(OFFLINE_MODE_KEY, 'true')
  }

  if (!accessToken.value && isOffline.value && localStorage.getItem(ANONYMOUS_PROFILE_KEY)) {
    const anonymousProfile = localStorage.getItem(ANONYMOUS_PROFILE_KEY)!
    userId.value = `anonymous:${anonymousProfile}`
    username.value = 'Без аккаунта'
    isAnonymous.value = true
  }

  restoreUserFromToken(accessToken.value)

  const isAuthenticated = computed(() =>
    accessToken.value !== null || (isOffline.value && userId.value !== null)
  )

  function saveTokens(tokens: authApi.TokenResponse) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    isOffline.value = false
    isAnonymous.value = false
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    localStorage.removeItem(OFFLINE_MODE_KEY)
    restoreUserFromToken(tokens.accessToken)
  }

  async function register(username: string, password: string) {
    return authApi.register({ username, password })
  }

  async function login(loginUsername: string, password: string, signal?: AbortSignal) {
    const tokens = await authApi.login({ username: loginUsername, password }, signal)
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
    isOffline.value = false
    isAnonymous.value = false
    userId.value = null
    username.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(OFFLINE_MODE_KEY)

    if (currentRefreshToken) {
      try {
        await authApi.logout(currentRefreshToken)
      } catch (error) {
        console.warn('Failed to log out from the server:', error)
      }
    }
  }

  return {
    accessToken,
    userId,
    username,
    isOffline,
    isAuthenticated,
    isAnonymous,
    register,
    login,
    continueWithoutAccount,
    loadCurrentUser,
    refresh,
    logout
  }
})
