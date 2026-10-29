import type { Category } from "@/types/category"

export const SYSTEM_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Food',
    icon: 'mdi-food',
    color: '#FF7043',
    system: true,
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'mdi-car',
    color: '#42A5F5',
    system: true,
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'mdi-home',
    color: '#AB47BC',
    system: true,
  },
  {
    id: 'clothes',
    name: 'Clothing',
    icon: 'mdi-tshirt-crew',
    color: '#FFB74D',
    system: true,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'mdi-shopping',
    color: '#EC407A',
    system: true,
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'mdi-gamepad-variant',
    color: '#7E57C2',
    system: true,
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'mdi-heart-pulse',
    color: '#26A69A',
    system: true,
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    icon: 'mdi-calendar-check',
    color: '#FFCA28',
    system: true,
  }
]

export const DEFAULT_CATEGORY_DISPLAY: Category = {
  id: 'default',
  name: 'Uncategorized',
  icon: 'mdi-help-circle-outline',
  color: '#9E9E9E',
  system: false,
}
