import { DEFAULT_CURRENCY } from "@/types/currency";
import type { ApiResponseExpenseDto, BatchUpdateExpenseDto, CreateExpenseDto, Expense, UpdateExpenseDto } from "@/types/expense";

export function parseApiExpense(apiExpense: ApiResponseExpenseDto): Expense {
  return {
    id: apiExpense.id,
    amount: apiExpense.amount ?? 0,
    currency: apiExpense.currency ?? DEFAULT_CURRENCY,
    categoryId: apiExpense.categoryId,
    customCategoryId: apiExpense.customCategoryId,
    createdAt: apiExpense.createdAt,
    description: apiExpense.description,
    paymentDate: apiExpense.paymentDate,
    deletedAt: apiExpense.deletedAt,
    isSynced: true,
    isCreatedLocally: false,
  };
}

export function mapExpenseToCreateDto(expense: Expense): CreateExpenseDto {
  return {
    id: expense.id,
    amount: expense.amount,
    currency: expense.currency,
    categoryId: expense.categoryId,
    customCategoryId: expense.customCategoryId,
    createdAt: expense.createdAt,
    description: expense.description,
    paymentDate: expense.paymentDate,
  };
}

export function mapExpenseToUpdateDto(expense: Expense): UpdateExpenseDto {
  return {
    amount: expense.amount,
    currency: expense.currency,
    categoryId: expense.categoryId,
    customCategoryId: expense.customCategoryId,
    clearCategory: expense.clearCategory,
    description: expense.description,
    paymentDate: expense.paymentDate,
  };
}

export function mapExpenseToBatchUpdateDto(expense: Expense): BatchUpdateExpenseDto {
  return {
    id: expense.id,
    amount: expense.amount,
    currency: expense.currency,
    categoryId: expense.categoryId,
    customCategoryId: expense.customCategoryId,
    clearCategory: expense.clearCategory,
    description: expense.description,
    paymentDate: expense.paymentDate,
  };
}