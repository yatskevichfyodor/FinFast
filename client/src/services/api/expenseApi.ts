import axios from "axios";
import { expenseClient } from "@/services/api/http";
import type { CreateExpensePayload, ExpenseApiBody, SyncExpensesRequest, UpdateExpenseRequest } from "@/types/expense";


export const expenseApi = {
  async getExpense(id: string): Promise<ExpenseApiBody | undefined> {
    try {
      const { data } = await expenseClient.get<ExpenseApiBody>(`/expenses/${id}`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return undefined;
      }

      throw error;
    }
  },

  async getExpensesByIds(ids: string[]): Promise<ExpenseApiBody[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      const { data } = await expenseClient.get<ExpenseApiBody[]>("/expenses", {
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

  async getExpenses(): Promise<ExpenseApiBody[]> {
    const { data } = await expenseClient.get<ExpenseApiBody[]>("/expenses");
    return data;
  },

  async createExpense(expense: CreateExpensePayload): Promise<void> {
    await expenseClient.post("/expenses", expense);
  },

  async syncExpenses(request: SyncExpensesRequest): Promise<void> {
    await expenseClient.post("/expenses/sync", request);
  },

  async updateExpense(
    id: string,
    updates: UpdateExpenseRequest,
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
