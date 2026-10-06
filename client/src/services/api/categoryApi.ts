import { expenseClient } from "@/services/api/http";
import type {
  Category,
  CustomAndHiddenSystemCategoriesDto,
  CustomCategoryCreateDto,
  CustomCategory,
  CustomCategoryPatchDto,
} from "@/types/category";

export const categoryApi = {
  async getCustomAndHiddenSystemCategories(): Promise<CustomAndHiddenSystemCategoriesDto> {
    const { data } =
      await expenseClient.get<CustomAndHiddenSystemCategoriesDto>(
        "/categories",
      );
    return data;
  },

  async getCustomCategories(): Promise<Category[]> {
    const { data } = await expenseClient.get<Category[]>("/categories/custom");
    return data;
  },

  async createCustomCategory(
    input: CustomCategoryCreateDto,
  ): Promise<CustomCategory> {
    const { data } = await expenseClient.post<CustomCategory>(
      "/categories/custom",
      input,
    );
    return data;
  },

  async updateCustomCategory(categoryId: string, input: CustomCategoryPatchDto): Promise<CustomCategory> {
    const { data } = await expenseClient.patch<CustomCategory>(
      `/categories/custom/${categoryId}`,
      input,
    );
    return data;
  },

  hideCustomCategory(categoryId: string) {
    return expenseClient.post(`/categories/custom/${categoryId}/hide`);
  },

  deleteCustomCategory(categoryId: string) {
    return expenseClient.delete(`/categories/custom/${categoryId}`);
  },

  restoreCustomCategory(categoryId: string) {
    return expenseClient.post(`/categories/custom/${categoryId}/restore`);
  },

  async getNumberOfLinkedExpenses(categoryId: string): Promise<number> {
    const { data } = await expenseClient.get<number>(
      `/categories/custom/${categoryId}/count`,
    );
    return Number(data);
  },

  async getSystemHiddenCategoriesIds(): Promise<string[]> {
    const { data } = await expenseClient.get<string[]>(
      "/categories/system/hidden",
    );
    return data;
  },

  hideSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/hide`);
  },

  restoreSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/restore`);
  },
};
