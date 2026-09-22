import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import * as categoryApi from '@/services/api/categoryApi'
import { CATEGORIES } from '@/constants/categories'
import { useAuthStore } from '@/stores/auth'
import type { Category, CategoryInput } from '@/types/category'

const CACHE_KEY = 'finfast-categories:'
const PENDING_KEY = 'finfast-category-operations:'

type PendingOperation =
  | { type: 'create'; input: CategoryInput }
  | { type: 'update'; id: string; input: CategoryInput }
  | { type: 'delete' | 'restore' | 'hideSystem' | 'restoreSystem'; id: string }

export const useCategoryStore = defineStore('category', () => {
  const authStore = useAuthStore()
  const categories = ref<Category[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const availableCategories = computed(() => categories.value.filter(category => !category.deleted && !category.hidden))

  function fallbackCategories(): Category[] {
    return CATEGORIES.map(category => ({ ...category, system: true }))
  }

  function cacheKey() {
    return `${CACHE_KEY}${authStore.userId ?? 'anonymous'}`
  }

  function saveCache() {
    localStorage.setItem(cacheKey(), JSON.stringify(categories.value))
  }

  function pendingKey() {
    return `${PENDING_KEY}${authStore.userId ?? 'anonymous'}`
  }

  function readPending(): PendingOperation[] {
    try { return JSON.parse(localStorage.getItem(pendingKey()) ?? '[]') as PendingOperation[] } catch { return [] }
  }

  function queue(operation: PendingOperation) {
    localStorage.setItem(pendingKey(), JSON.stringify([...readPending(), operation]))
  }

  async function flushPending() {
    const pending = readPending()
    if (pending.length === 0) return
    const remaining: PendingOperation[] = []
    for (const operation of pending) {
      try {
        if (operation.type === 'create') await categoryApi.createCategory(operation.input)
        if (operation.type === 'update') await categoryApi.updateCategory(operation.id, operation.input)
        if (operation.type === 'delete') await categoryApi.deleteCategory(operation.id)
        if (operation.type === 'restore') await categoryApi.restoreCategory(operation.id)
        if (operation.type === 'hideSystem') await categoryApi.hideSystemCategory(operation.id)
        if (operation.type === 'restoreSystem') await categoryApi.restoreSystemCategory(operation.id)
      } catch { remaining.push(operation) }
    }
    localStorage.setItem(pendingKey(), JSON.stringify(remaining))
  }

  function loadCache() {
    try {
      const cached = localStorage.getItem(cacheKey())
      categories.value = cached ? JSON.parse(cached) as Category[] : fallbackCategories()
    } catch {
      categories.value = fallbackCategories()
    }
  }

  async function load() {
    loadCache()
    if (authStore.isAnonymous || !authStore.accessToken) return
    isLoading.value = true
    error.value = null
    try {
      categories.value = await categoryApi.getEditorCategories()
      await flushPending()
      if (readPending().length < 1) categories.value = await categoryApi.getEditorCategories()
      saveCache()
    } catch {
      error.value = 'Не удалось синхронизировать категории'
    } finally {
      isLoading.value = false
    }
  }

  async function create(input: CategoryInput) {
    const localInput = { ...input, id: input.id ?? crypto.randomUUID() }
    try {
      const category = await categoryApi.createCategory(localInput)
      categories.value.push(category)
    } catch {
      categories.value.push({ ...localInput, system: false, deleted: false })
      queue({ type: 'create', input: localInput })
    }
    saveCache()
  }

  async function update(id: string, input: CategoryInput) {
    let category: Category
    try { category = await categoryApi.updateCategory(id, input) } catch {
      queue({ type: 'update', id, input })
      category = { id, ...input, system: false, deleted: false }
    }
    const index = categories.value.findIndex(item => item.id === id)
    if (index >= 0) categories.value[index] = category
    saveCache()
  }

  async function remove(id: string) {
    try { await categoryApi.deleteCategory(id) } catch { queue({ type: 'delete', id }) }
    const category = categories.value.find(item => item.id === id)
    if (category) category.deleted = true
    saveCache()
  }

  async function restore(id: string) {
    try { await categoryApi.restoreCategory(id) } catch { queue({ type: 'restore', id }) }
    const category = categories.value.find(item => item.id === id)
    if (category) category.deleted = false
    saveCache()
  }

  async function hideSystem(id: string) {
    try { await categoryApi.hideSystemCategory(id) } catch { queue({ type: 'hideSystem', id }) }
    const category = categories.value.find(item => item.id === id)
    if (category) category.hidden = true
    saveCache()
  }

  async function restoreSystem(id: string) {
    try { await categoryApi.restoreSystemCategory(id) } catch { queue({ type: 'restoreSystem', id }) }
    const category = categories.value.find(item => item.id === id)
    if (category) category.hidden = false
    saveCache()
  }

  watch(() => authStore.userId, () => { void load() }, { immediate: true })

  return { categories, availableCategories, isLoading, error, load, create, update, remove, restore, hideSystem, restoreSystem }
})