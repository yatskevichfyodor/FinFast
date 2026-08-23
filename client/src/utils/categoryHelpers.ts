import { CATEGORIES, type Category } from '@/constants/categories'

export function getCategoryById(id: string | undefined): Category | undefined {
  return CATEGORIES.find(cat => cat.id === id)
}

export function getCategoryDisplay(categoryId: string | undefined) {
  if (categoryId === undefined || categoryId === null) {
    return {
      name: 'Без категории',
      icon: 'mdi-help-circle-outline',
      color: '#9E9E9E'
    }
  }
  return getCategoryById(categoryId) || {
    name: 'Без категории',
    icon: 'mdi-help-circle-outline',
    color: '#9E9E9E'
  }
}
