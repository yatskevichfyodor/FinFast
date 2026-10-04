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

  async updateCustomCategory(id: string, input: CategoryInput) {
    const { data } = await expenseClient.patch<Category>(
      `/categories/custom/${id}`,
      input,
    );
    return data;
  },

  deleteCustomCategory(id: string) {
    return expenseClient.delete(`/categories/custom/${id}`);
  },

  restoreCustomCategory(id: string) {
    return expenseClient.post(`/categories/custom/${id}/restore`);
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
