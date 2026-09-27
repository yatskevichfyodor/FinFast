export interface Category {
  id: string
  name: string
  icon: string
  color: string
  system: boolean
  hidden?: boolean
  deleted?: boolean
}

export interface CustomCategory {
  id: string
  name: string
  icon: string
  color: string
}

export interface CategoryInput {
  name: string
  icon: string
  color: string
}