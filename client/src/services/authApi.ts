import { isAxiosError } from 'axios'
import { api } from '@/services/api'

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
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export async function register(request: RegisterRequest): Promise<UserResponse> {
  const { data } = await api.post<UserResponse>('/auth/register', request)
  return data
}

export async function login(request: LoginRequest, signal?: AbortSignal): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', request, {
    signal,
    timeout: 65000
  })
  return data
}

export async function me(): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>('/auth/me')
  return data
}

export async function isAvailable(): Promise<boolean> {
  try {
    await api.get('/auth/me', { timeout: 3000 })
    return true
  } catch (error) {
    return isAxiosError(error) && error.response !== undefined
  }
}

export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/refresh', { refreshToken })
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken })
}
