import { expenseClient } from "@/services/api/http";
import type { Category, CategoryInput, CustomAndHiddenSystemCategoriesDto, CustomCategory } from "@/types/category";

export const categoryApi = {
  async getCustomAndHiddenSystemCategories(): Promise<CustomAndHiddenSystemCategoriesDto> {
    const { data } = await expenseClient.get<CustomAndHiddenSystemCategoriesDto>("/categories");
    return data;
  },

  async getCustomCategories(): Promise<Category[]> {
    const { data } = await expenseClient.get<Category[]>("/categories/custom");
    return data;
  },

  async createCustomCategory(input: CustomCategory) {
    const { data } = await expenseClient.post<Category>("/categories/custom", input);
    return data;
  },

  async updateCustomCategory(categoryId: string, input: CategoryInput) {
    const { data } = await expenseClient.patch<Category>(
      `/categories/custom/${categoryId}`,
      input,
    );
    return data;
  },

  deleteCustomCategory(categoryId: string) {
    return expenseClient.delete(`/categories/custom/${categoryId}`);
  },

  restoreCustomCategory(categoryId: string) {
    return expenseClient.post(`/categories/custom/${categoryId}/restore`);
  },

  async getNumberOfLinkedExpenses(categoryId: string): Promise<Number> {
    const { data } = await expenseClient.get<Number>(`/custom/${categoryId}/count`);
    return data;
  },
  
  async getSystemHiddenCategoriesIds(): Promise<string[]> {
    const { data } = await expenseClient.get<string[]>("/categories/system/hidden");
    return data;
  },

  hideSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/hide`);
  },

  restoreSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/restore`);
  },
};
