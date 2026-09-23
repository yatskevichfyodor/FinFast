import { expenseClient } from "@/services/api/http";
import type { Category, CategoryInput } from "@/types/category";

export const categoryApi = {
  async getAvailableCategories() {
    const { data } = await expenseClient.get<Category[]>("/categories");
    return data;
  },

  async getEditorCategories() {
    const { data } = await expenseClient.get<Category[]>("/categories/editor");
    return data;
  },

  async createCategory(input: CategoryInput) {
    const { data } = await expenseClient.post<Category>("/categories", input);
    return data;
  },

  async updateCategory(id: string, input: CategoryInput) {
    const { data } = await expenseClient.patch<Category>(
      `/categories/${id}`,
      input,
    );
    return data;
  },

  deleteCategory(id: string) {
    return expenseClient.delete(`/categories/${id}`);
  },

  restoreCategory(id: string) {
    return expenseClient.post(`/categories/${id}/restore`);
  },

  hideSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/hide`);
  },

  restoreSystemCategory(id: string) {
    return expenseClient.post(`/categories/system/${id}/restore`);
  },
};
