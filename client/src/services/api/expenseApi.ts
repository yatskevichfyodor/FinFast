import axios from "axios";
import { expenseClient } from "@/services/api/http";
import type { CreateExpenseDto, ApiResponseExpenseDto, SyncExpensesDto, UpdateExpenseDto } from "@/types/expense";


export const expenseApi = {
  async getExpense(id: string): Promise<ApiResponseExpenseDto | undefined> {
    try {
      const { data } = await expenseClient.get<ApiResponseExpenseDto>(`/expenses/${id}`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return undefined;
      }

      throw error;
    }
  },

  async getExpensesByIds(ids: string[]): Promise<ApiResponseExpenseDto[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      const { data } = await expenseClient.get<ApiResponseExpenseDto[]>("/expenses", {
        params: { ids: ids.join(",") },
      });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }

      throw error;
    }
  },

  async getExpenses(): Promise<ApiResponseExpenseDto[]> {
    const { data } = await expenseClient.get<ApiResponseExpenseDto[]>("/expenses");
    return data;
  },

  async createExpense(expense: CreateExpenseDto): Promise<void> {
    await expenseClient.post("/expenses", expense);
  },

  async syncExpenses(request: SyncExpensesDto): Promise<void> {
    await expenseClient.post("/expenses/sync", request);
  },

  async updateExpense(
    id: string,
    updates: UpdateExpenseDto,
  ): Promise<void> {
    await expenseClient.patch(`/expenses/${id}`, updates);
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await expenseClient.delete(`/expenses/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return;
      }

      throw error;
    }
  },
};
