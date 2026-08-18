export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Еда',
    icon: 'mdi-food',
    color: '#FF7043'
  },
  {
    id: 'transport',
    name: 'Транспорт',
    icon: 'mdi-car',
    color: '#42A5F5'
  },
  {
    id: 'home',
    name: 'Дом',
    icon: 'mdi-home',
    color: '#AB47BC'
  },
  {
    id: 'shopping',
    name: 'Покупки',
    icon: 'mdi-shopping',
    color: '#EC407A'
  },
  {
    id: 'entertainment',
    name: 'Развлечения',
    icon: 'mdi-gamepad-variant',
    color: '#7E57C2'
  },
  {
    id: 'health',
    name: 'Здоровье',
    icon: 'mdi-heart-pulse',
    color: '#26A69A'
  },
  {
    id: 'subscriptions',
    name: 'Подписки',
    icon: 'mdi-calendar-check',
    color: '#FFCA28'
  },
  {
    id: 'other',
    name: 'Другое',
    icon: 'mdi-dots-horizontal-circle',
    color: '#78909C'
  }
]
