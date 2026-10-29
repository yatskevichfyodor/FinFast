import type { Expense } from '@/types/expense'
import { i18n } from '@/i18n'

export const IMPORT_FORMAT_VERSION = 1
export const CURRENT_IMPORT_FORMAT_VERSION = 2

export interface ImportedCustomCategory {
  id: string
  name: string
  icon: string
  color: string
}

export interface ImportedExpense {
  expenseId: string
  amount: number
  categoryId?: string
  customCategoryId?: string
  createdAt: string
  description?: string
  paymentDate?: string
}

export interface ImportFileData {
  format: string
  version: number
  expenses: ImportedExpense[]
  categories?: ImportedCustomCategory[]
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

    if (obj.version !== IMPORT_FORMAT_VERSION && obj.version !== CURRENT_IMPORT_FORMAT_VERSION) {
      return {
        data: null,
        error: i18n.global.t('import.unsupportedVersion', {
          version: obj.version,
          supported: `${IMPORT_FORMAT_VERSION}, ${CURRENT_IMPORT_FORMAT_VERSION}`
        })
      }
    }

    // Проверка expenses
    if (!Array.isArray(obj.expenses)) {
      return { data: null, error: i18n.global.t('import.expensesArray') }
    }

    if (obj.expenses.length === 0) {
      return { data: null, error: i18n.global.t('import.emptyExpenses') }
    }

    let categories: ImportedCustomCategory[] = []
    if (obj.version === CURRENT_IMPORT_FORMAT_VERSION) {
      if (!Array.isArray(obj.categories)) {
        return { data: null, error: i18n.global.t('import.validationErrors', { errors: 'Custom category definitions are missing.' }) }
      }

      const seenCategoryIds = new Set<string>()
      const categoryErrors = obj.categories.flatMap((category, index) => {
        if (!category || typeof category !== 'object') {
          return [`Custom category #${index + 1} must be an object.`]
        }
        const item = category as Record<string, unknown>
        if (typeof item.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
          return [`Custom category #${index + 1} has an invalid ID.`]
        }
        if (seenCategoryIds.has(item.id)) {
          return [`Custom category #${index + 1} has a duplicate ID.`]
        }
        seenCategoryIds.add(item.id)
        if (['name', 'icon', 'color'].some(key => typeof item[key] !== 'string' || !(item[key] as string).trim())) {
          return [`Custom category #${index + 1} must include a name, icon, and color.`]
        }
        if ((item.name as string).trim().length > 100) {
          return [`Custom category #${index + 1} name must be at most 100 characters.`]
        }
        return []
      })

      if (categoryErrors.length > 0) {
        return { data: null, error: i18n.global.t('import.validationErrors', { errors: categoryErrors.join('\n') }) }
      }
      categories = obj.categories as ImportedCustomCategory[]
    }

    // Валидация каждого расхода
    const expenseErrors: string[] = []
    const seenExpenseIds = new Set<string>()
    for (let i = 0; i < obj.expenses.length; i++) {
      const expense = obj.expenses[i]
      const expenseError = validateExpense(expense, i)
      if (expenseError) {
        expenseErrors.push(expenseError)
      } else {
        const expenseId = (expense as Record<string, unknown>).expenseId as string
        if (seenExpenseIds.has(expenseId)) {
          expenseErrors.push(`Expense #${i + 1}: duplicate expenseId "${expenseId}"`)
        }
        seenExpenseIds.add(expenseId)
      }
    }

    if (expenseErrors.length > 0) {
      return {
        data: null,
        error: i18n.global.t('import.validationErrors', { errors: expenseErrors.join('\n') })
      }
    }

    if (obj.version === CURRENT_IMPORT_FORMAT_VERSION) {
      const categoryIds = new Set(categories.map(category => category.id))
      const missingCategoryIds = [...new Set((obj.expenses as unknown as Record<string, unknown>[])
        .map(expense => expense.customCategoryId)
        .filter((id): id is string => typeof id === 'string' && !categoryIds.has(id)))]
      if (missingCategoryIds.length > 0) {
        return {
          data: null,
          error: i18n.global.t('import.validationErrors', {
            errors: `Missing custom category definitions for: ${missingCategoryIds.join(', ')}`
          })
        }
      }
    }

    const normalizedExpenses = obj.expenses.map(expense => {
      const { categoryId, customCategoryId, ...expenseData } = expense as Record<string, unknown>

      return {
        ...expenseData,
        ...(typeof categoryId === 'string' ? { categoryId } : {}),
        ...(typeof customCategoryId === 'string' ? { customCategoryId } : {})
      }
    })

    return {
      data: {
        ...obj,
        categories,
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exp.expenseId as string)) {
    return i18n.global.t('import.expenseIdUuid', { index: index + 1 })
  }

  // Проверка amount
  if (typeof exp.amount !== 'number' || exp.amount <= 0) {
    return i18n.global.t('import.amountPositive', { index: index + 1 })
  }

  if (exp.categoryId !== undefined && exp.categoryId !== null && typeof exp.categoryId !== 'string') {
    return i18n.global.t('import.categoryType', { index: index + 1 })
  }

  if (exp.customCategoryId !== undefined && exp.customCategoryId !== null &&
      (typeof exp.customCategoryId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exp.customCategoryId))) {
    return `Expense #${index + 1}: "customCategoryId" must be a valid UUID or omitted`
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
    customCategoryId: imported.customCategoryId,
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
        customCategoryId: imported_expense.customCategoryId,
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


