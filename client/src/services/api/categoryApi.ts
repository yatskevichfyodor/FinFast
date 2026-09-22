import { expenseApi } from '@/services/api/http'
import type { Category, CategoryInput } from '@/types/category'

export async function getAvailableCategories() {
  const { data } = await expenseApi.get<Category[]>('/categories')
  return data
}

export async function getEditorCategories() {
  const { data } = await expenseApi.get<Category[]>('/categories/editor')
  return data
}

export async function createCategory(input: CategoryInput) {
  const { data } = await expenseApi.post<Category>('/categories', input)
  return data
}

export async function updateCategory(id: string, input: CategoryInput) {
  const { data } = await expenseApi.patch<Category>(`/categories/${id}`, input)
  return data
}

export function deleteCategory(id: string) {
  return expenseApi.delete(`/categories/${id}`)
}

export function restoreCategory(id: string) {
  return expenseApi.post(`/categories/${id}/restore`)
}

export function hideSystemCategory(id: string) {
  return expenseApi.post(`/categories/system/${id}/hide`)
}

export function restoreSystemCategory(id: string) {
  return expenseApi.post(`/categories/system/${id}/restore`)
}