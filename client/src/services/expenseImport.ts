import type { Expense } from '@/types/expense'

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
      return { data: null, error: 'JSON должен содержать объект верхнего уровня' }
    }

    const obj = data as Record<string, unknown>

    // Проверка format
    if (obj.format !== 'finfast') {
      return {
        data: null,
        error: `Неподдерживаемый формат: "${String(obj.format)}". Ожидается "finfast"`
      }
    }

    // Проверка version
    if (typeof obj.version !== 'number') {
      return { data: null, error: 'Поле "version" должно быть числом' }
    }

    if (obj.version !== IMPORT_FORMAT_VERSION) {
      return {
        data: null,
        error: `Версия формата ${obj.version} не поддерживается. Поддерживается версия ${IMPORT_FORMAT_VERSION}`
      }
    }

    // Проверка expenses
    if (!Array.isArray(obj.expenses)) {
      return { data: null, error: 'Поле "expenses" должно быть массивом' }
    }

    if (obj.expenses.length === 0) {
      return { data: null, error: 'Массив "expenses" пуст' }
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
        error: `Ошибки валидации расходов:\n${expenseErrors.join('\n')}`
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
    const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return {
      data: null,
      error: `Ошибка синтаксиса JSON: ${errorMsg}`
    }
  }
}

function validateExpense(expense: unknown, index: number): string | null {
  if (!expense || typeof expense !== 'object') {
    return `Расход #${index + 1}: ожидается объект`
  }

  const exp = expense as Record<string, unknown>

  // Проверка expenseId
  if (typeof exp.expenseId !== 'string' || !exp.expenseId.trim()) {
    return `Расход #${index + 1}: "expenseId" должен быть непустой строкой`
  }

  // Проверка UUID формата (простая проверка)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(exp.expenseId as string)) {
    return `Расход #${index + 1}: "expenseId" не является корректным UUID`
  }

  // Проверка amount
  if (typeof exp.amount !== 'number' || exp.amount <= 0) {
    return `Расход #${index + 1}: "amount" должен быть положительным числом`
  }

  if (exp.categoryId !== undefined && exp.categoryId !== null && typeof exp.categoryId !== 'string') {
    return `Расход #${index + 1}: "categoryId" должен быть строкой или отсутствовать`
  }

  // Проверка description (опциональное поле)
  if (exp.description !== undefined && exp.description !== null && typeof exp.description !== 'string') {
    return `Расход #${index + 1}: "description" должен быть строкой или отсутствовать`
  }

  // Проверка paymentDate (опциональное поле)
  if (exp.paymentDate !== undefined && exp.paymentDate !== null) {
    if (typeof exp.paymentDate !== 'string' || !exp.paymentDate.trim()) {
      return `Расход #${index + 1}: "paymentDate" должен быть непустой строкой или отсутствовать`
    }
    // Проверка валидности ISO даты
    const paymentDate = new Date(exp.paymentDate as string)
    if (isNaN(paymentDate.getTime())) {
      return `Расход #${index + 1}: "paymentDate" не является валидной ISO датой`
    }
  }

  // Проверка createdAt
  if (typeof exp.createdAt !== 'string' || !exp.createdAt.trim()) {
    return `Расход #${index + 1}: "createdAt" должен быть непустой строкой`
  }

  // Проверка валидности ISO даты
  const date = new Date(exp.createdAt as string)
  if (isNaN(date.getTime())) {
    return `Расход #${index + 1}: "createdAt" не является валидной ISO датой`
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
    isDeleted: false,
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


