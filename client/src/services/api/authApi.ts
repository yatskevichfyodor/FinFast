import { authClient } from '@/services/api/http'

export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface UserResponse {
  id: string
  username: string
  email?: string
  googleLinked: boolean
  hasPassword: boolean
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export const authApi = {
  async register(request: RegisterRequest): Promise<UserResponse> {
    const { data } = await authClient.post<UserResponse>('/auth/register', request)
    return data
  },

  async login(request: LoginRequest, signal?: AbortSignal): Promise<TokenResponse> {
    const { data } = await authClient.post<TokenResponse>('/auth/login', request, {
      signal,
      timeout: 65000
    })
    return data
  },

  async loginWithGoogle(credential: string): Promise<TokenResponse> {
    const { data } = await authClient.post<TokenResponse>('/auth/google', { credential })
    return data
  },

  async linkGoogleAccount(credential: string): Promise<UserResponse> {
    const { data } = await authClient.post<UserResponse>('/auth/me/google', { credential })
    return data
  },

  async unlinkGoogleAccount(): Promise<UserResponse> {
    const { data } = await authClient.delete<UserResponse>('/auth/me/google')
    return data
  },

  async updateProfile(username: string): Promise<UserResponse> {
    const { data } = await authClient.patch<UserResponse>('/auth/me', { username })
    return data
  },

  async setPassword(password: string): Promise<UserResponse> {
    const { data } = await authClient.put<UserResponse>('/auth/me/password', { password })
    return data
  },

  async deleteAccount(): Promise<void> {
    await authClient.delete('/auth/me')
  },

  async me(): Promise<UserResponse> {
    const { data } = await authClient.get<UserResponse>('/auth/me')
    return data
  },

  async isAvailable(): Promise<boolean> {
    try {
      await authClient.get('/health', { timeout: 20000 })
      return true
    } catch {
      return false
    }
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await authClient.post<TokenResponse>('/auth/refresh', { refreshToken })
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await authClient.post('/auth/logout', { refreshToken })
  }
}