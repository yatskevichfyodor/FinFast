import type { Expense } from '@/types/expense'
import { i18n } from '@/i18n'

export const IMPORT_FORMAT_VERSION = 1

export interface ImportedExpense {
  expenseId: string
  amount: number
  categoryId?: string
  createdAt: string
  description?: string
  paymentDate?: string
}

export interface ImportFileData {
  format: string
  version: number
  expenses: ImportedExpense[]
}

export interface ImportResult {
  success: boolean
  message: string
  added: number
  updated: number
  errors: string[]
}

export function validateJson(content: string): { data: ImportFileData; error: null } | { data: null; error: string } {
  try {
    const data = JSON.parse(content) as unknown

    if (!data || typeof data !== 'object') {
      return { data: null, error: i18n.global.t('import.validationObject') }
    }

    const obj = data as Record<string, unknown>

    // Проверка format
    if (obj.format !== 'finfast') {
      return {
        data: null,
        error: i18n.global.t('import.unsupportedFormat', { format: String(obj.format) })
      }
    }

    // Проверка version
    if (typeof obj.version !== 'number') {
      return { data: null, error: i18n.global.t('import.versionNumber') }
    }

    if (obj.version !== IMPORT_FORMAT_VERSION) {
      return {
        data: null,
        error: i18n.global.t('import.unsupportedVersion', { version: obj.version, supported: IMPORT_FORMAT_VERSION })
      }
    }

    // Проверка expenses
    if (!Array.isArray(obj.expenses)) {
      return { data: null, error: i18n.global.t('import.expensesArray') }
    }

    if (obj.expenses.length === 0) {
      return { data: null, error: i18n.global.t('import.emptyExpenses') }
    }

    // Валидация каждого расхода
    const expenseErrors: string[] = []
    for (let i = 0; i < obj.expenses.length; i++) {
      const expense = obj.expenses[i]
      const expenseError = validateExpense(expense, i)
      if (expenseError) {
        expenseErrors.push(expenseError)
      }
    }

    if (expenseErrors.length > 0) {
      return {
        data: null,
        error: i18n.global.t('import.validationErrors', { errors: expenseErrors.join('\n') })
      }
    }

    const normalizedExpenses = obj.expenses.map(expense => {
      const { categoryId, ...expenseData } = expense as Record<string, unknown>

      return typeof categoryId === 'string'
        ? { ...expenseData, categoryId }
        : expenseData
    })

    return {
      data: {
        ...obj,
        expenses: normalizedExpenses
      } as unknown as ImportFileData,
      error: null
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : i18n.global.t('import.unknown')
    return {
      data: null,
      error: i18n.global.t('import.jsonSyntax', { error: errorMsg })
    }
  }
}

function validateExpense(expense: unknown, index: number): string | null {
  if (!expense || typeof expense !== 'object') {
    return i18n.global.t('import.expectedObject', { index: index + 1 })
  }

  const exp = expense as Record<string, unknown>

  // Проверка expenseId
  if (typeof exp.expenseId !== 'string' || !exp.expenseId.trim()) {
    return i18n.global.t('import.expenseIdString', { index: index + 1 })
  }

  // Проверка UUID формата (простая проверка)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(exp.expenseId as string)) {
    return i18n.global.t('import.expenseIdUuid', { index: index + 1 })
  }

  // Проверка amount
  if (typeof exp.amount !== 'number' || exp.amount <= 0) {
    return i18n.global.t('import.amountPositive', { index: index + 1 })
  }

  if (exp.categoryId !== undefined && exp.categoryId !== null && typeof exp.categoryId !== 'string') {
    return i18n.global.t('import.categoryType', { index: index + 1 })
  }

  // Проверка description (опциональное поле)
  if (exp.description !== undefined && exp.description !== null && typeof exp.description !== 'string') {
    return i18n.global.t('import.descriptionType', { index: index + 1 })
  }

  // Проверка paymentDate (опциональное поле)
  if (exp.paymentDate !== undefined && exp.paymentDate !== null) {
    if (typeof exp.paymentDate !== 'string' || !exp.paymentDate.trim()) {
      return i18n.global.t('import.paymentDateString', { index: index + 1 })
    }
    // Проверка валидности ISO даты
    const paymentDate = new Date(exp.paymentDate as string)
    if (isNaN(paymentDate.getTime())) {
      return i18n.global.t('import.paymentDateInvalid', { index: index + 1 })
    }
  }

  // Проверка createdAt
  if (typeof exp.createdAt !== 'string' || !exp.createdAt.trim()) {
    return i18n.global.t('import.createdAtString', { index: index + 1 })
  }

  // Проверка валидности ISO даты
  const date = new Date(exp.createdAt as string)
  if (isNaN(date.getTime())) {
    return i18n.global.t('import.createdAtInvalid', { index: index + 1 })
  }

  return null
}

export function convertImportedExpenseToExpense(
  imported: ImportedExpense,
  isSynced: boolean
): Expense {
  return {
    id: imported.expenseId,
    amount: imported.amount,
    categoryId: imported.categoryId,
    createdAt: imported.createdAt,
    description: imported.description,
    paymentDate: imported.paymentDate,
    isSynced,
    isCreatedLocally: !isSynced
  }
}

export function mergeExpenses(
  existing: Expense[],
  imported: ImportedExpense[]
): { merged: Expense[]; added: number; updated: number } {
  const existingMap = new Map(existing.map(e => [e.id, e]))
  let added = 0
  let updated = 0

  const imported_set = new Set(imported.map(i => i.expenseId))

  // Сохраняем существующие расходы, которых нет в импорте
  const result: Expense[] = existing.filter(e => !imported_set.has(e.id))

  // Добавляем/обновляем импортированные расходы
  imported.forEach(imported_expense => {
    const existing_expense = existingMap.get(imported_expense.expenseId)

    if (existing_expense) {
      // Обновление: изменяем существующую запись
      const updated_expense: Expense = {
        ...existing_expense,
        amount: imported_expense.amount,
        categoryId: imported_expense.categoryId,
        createdAt: imported_expense.createdAt,
        description: imported_expense.description,
        paymentDate: imported_expense.paymentDate,
        isSynced: false, // Отмечаем как требующую синхронизации
        isCreatedLocally: false
      }
      result.push(updated_expense)
      updated++
    } else {
      // Новая запись
      const new_expense = convertImportedExpenseToExpense(imported_expense, false)
      result.push(new_expense)
      added++
    }
  })

  return { merged: result, added, updated }
}


