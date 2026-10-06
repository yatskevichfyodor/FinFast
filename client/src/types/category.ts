export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  system: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  hiddenAt?: string
}

export interface CustomCategoryInput {
  name: string;
  icon: string;
  color: string;
}

export interface CustomCategoryCreateDto {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CustomCategoryPatchDto {
  name?: string;
  icon?: string;
  color?: string;
}

export interface CustomAndHiddenSystemCategoriesDto {
  customCategories: Category[];
  hiddenSystemCategoriesIds: string[];
}
