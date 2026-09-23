import axios from "axios";
import { expenseClient } from "@/services/api/http";

export interface ExpenseApiBody {
  id: string;
  amount?: number;
  categoryId?: string;
  customCategoryId?: string;
  createdAt: string;
  description?: string;
  paymentDate?: string;
  deletedAt?: string;
}

export interface CreateExpensePayload {
  id: string;
  amount: number;
  categoryId?: string;
  customCategoryId?: string;
  createdAt: string;
  description?: string;
  paymentDate?: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  categoryId?: string;
  customCategoryId?: string;
  clearCategory?: boolean;
  description?: string;
  paymentDate?: string;
}

export interface BatchUpdateExpenseRequest extends UpdateExpenseRequest {
  id: string;
}

export interface SyncExpensesRequest {
  create?: CreateExpensePayload[];
  update?: BatchUpdateExpenseRequest[];
  delete?: string[];
}

function normalizeInstant(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  const parsedValue = new Date(value);
  if (!Number.isNaN(parsedValue.getTime())) {
    return parsedValue.toISOString();
  }

  const legacyDateValue = value
    .replace(/T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, "")
    .replace(/\s+\([^)]*\)$/, "");
  const parsedLegacyValue = new Date(legacyDateValue);

  return Number.isNaN(parsedLegacyValue.getTime())
    ? value
    : parsedLegacyValue.toISOString();
}

function normalizeCreateExpense(
  expense: CreateExpensePayload,
): CreateExpensePayload {
  return {
    ...expense,
    createdAt: normalizeInstant(expense.createdAt)!,
    paymentDate: normalizeInstant(expense.paymentDate),
  };
}

function normalizeUpdateExpense<T extends UpdateExpenseRequest>(expense: T): T {
  return {
    ...expense,
    paymentDate: normalizeInstant(expense.paymentDate),
  };
}

export const expenseApi = {
  async getExpense(id: string): Promise<ExpenseApiBody | undefined> {
    try {
      const { data } = await expenseClient.get<ExpenseApiBody>(
        `/expenses/${id}`,
      );
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
    await expenseClient.post("/expenses", normalizeCreateExpense(expense));
  },

  async syncExpenses(request: SyncExpensesRequest): Promise<void> {
    await expenseClient.post("/expenses/sync", {
      ...request,
      create: request.create?.map(normalizeCreateExpense),
      update: request.update?.map(normalizeUpdateExpense),
    });
  },

  async updateExpense(
    id: string,
    updates: UpdateExpenseRequest,
  ): Promise<void> {
    await expenseClient.patch(
      `/expenses/${id}`,
      normalizeUpdateExpense(updates),
    );
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
