import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL

export const authApi = axios.create({
  baseURL: AUTH_BASE_URL
})

export const expenseApi = axios.create({
  baseURL: API_BASE_URL
})
