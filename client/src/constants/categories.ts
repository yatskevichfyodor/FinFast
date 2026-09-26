import type { Category } from "@/types/category"

export const SYSTEM_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Еда',
    icon: 'mdi-food',
    color: '#FF7043',
    system: true,
  },
  {
    id: 'transport',
    name: 'Транспорт',
    icon: 'mdi-car',
    color: '#42A5F5',
    system: true,
  },
  {
    id: 'home',
    name: 'Дом',
    icon: 'mdi-home',
    color: '#AB47BC',
    system: true,
  },
  {
    id: 'shopping',
    name: 'Покупки',
    icon: 'mdi-shopping',
    color: '#EC407A',
    system: true,
  },
  {
    id: 'entertainment',
    name: 'Развлечения',
    icon: 'mdi-gamepad-variant',
    color: '#7E57C2',
    system: true,
  },
  {
    id: 'health',
    name: 'Здоровье',
    icon: 'mdi-heart-pulse',
    color: '#26A69A',
    system: true,
  },
  {
    id: 'subscriptions',
    name: 'Подписки',
    icon: 'mdi-calendar-check',
    color: '#FFCA28',
    system: true,
  }
]

export const DEFAULT_CATEGORY_DISPLAY: Category = {
  id: 'default',
  name: 'Без категории',
  icon: 'mdi-help-circle-outline',
  color: '#9E9E9E',
  system: false,
}
