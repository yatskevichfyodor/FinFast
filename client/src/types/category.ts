export interface Category {
  id: string
  name: string
  icon: string
  color: string
  system: boolean
  hidden?: boolean
  deleted?: boolean
}

export interface CategoryInput {
  id?: string
  name: string
  icon: string
  color: string
}