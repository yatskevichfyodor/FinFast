import type { Expense } from '@/types/expense';
import type { CustomCategory } from '@/types/category';
import { getLocale, i18n } from '@/i18n';
import { CURRENT_IMPORT_FORMAT_VERSION } from '@/services/expenseImport';
import { formatCurrencyAmount, type CurrencyCode } from '@/types/currency';

export type ExportFormat = 'json' | 'csv'

interface ExportRow {
  expenseId: string
  amount: number
  currency: CurrencyCode
  categoryId?: string
  customCategoryId?: string
  createdAt: string
  description?: string
  paymentDate?: string
  date: string
  category?: string
}

interface JsonExport {
  format: 'finfast'
  version: 3
  categories: Array<Pick<CustomCategory, 'id' | 'name' | 'icon' | 'color'>>
  expenses: Array<Pick<ExportRow, 'expenseId' | 'amount' | 'currency' | 'categoryId' | 'customCategoryId' | 'createdAt' | 'description' | 'paymentDate'>>
}

function toExportRows(expenses: Expense[]): ExportRow[] {
  return expenses
    .filter(expense => !expense.deletedAt)
    .map(expense => ({
      expenseId: expense.id,
      amount: expense.amount,
      currency: expense.currency,
      categoryId: expense.categoryId,
      customCategoryId: expense.customCategoryId,
      createdAt: expense.createdAt,
      description: expense.description,
      paymentDate: expense.paymentDate,
      date: new Intl.DateTimeFormat(getLocale() === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(expense.paymentDate ? new Date(`${expense.paymentDate}T00:00:00`) : new Date(expense.createdAt)).replace(', ', ' '),
    }))
}

export function createJsonExport(expenses: Expense[], customCategories: CustomCategory[] = []): string {
  const rows = toExportRows(expenses)
  const categoriesById = new Map(customCategories.map(category => [category.id, category]))
  const missingCategoryIds = [...new Set(rows
    .map(row => row.customCategoryId)
    .filter((id): id is string => !!id && !categoriesById.has(id)))]
  if (missingCategoryIds.length > 0) {
    throw new Error(`Cannot export expenses with missing custom categories: ${missingCategoryIds.join(', ')}`)
  }
  const referencedCategoryIds = new Set(rows.flatMap(row =>
    row.customCategoryId && categoriesById.has(row.customCategoryId) ? [row.customCategoryId] : []
  ))
  const payload: JsonExport = {
    format: 'finfast',
    version: CURRENT_IMPORT_FORMAT_VERSION,
    categories: customCategories
      .filter(category => referencedCategoryIds.has(category.id))
      .map(({ id, name, icon, color }) => ({ id, name, icon, color })),
    expenses: rows.map(({ expenseId, amount, currency, categoryId, customCategoryId, createdAt, description, paymentDate }) => ({
      expenseId,
      amount,
      currency,
      createdAt,
      ...(typeof categoryId === 'string' ? { categoryId } : {}),
      ...(typeof customCategoryId === 'string' ? { customCategoryId } : {}),
      ...(typeof description === 'string' ? { description } : {}),
      ...(typeof paymentDate === 'string' ? { paymentDate } : {})
    }))
  }

  return JSON.stringify(payload, null, 2)
}

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value)
  return /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue
}

export function createCsvExport(expenses: Expense[], getCategoryName: (expense: Expense) => string = () => ''): string {
  const rows = toExportRows(expenses)
  const expensesById = new Map(expenses.map(expense => [expense.id, expense]))
  const header = [
    i18n.global.t('export.date'),
    i18n.global.t('export.amount'),
    i18n.global.t('export.category'),
    i18n.global.t('export.description'),
  ]
  const lines = [
    header,
    ...rows.map(row => [
      row.date,
      formatCurrencyAmount(row.amount, row.currency),
      getCategoryName(expensesById.get(row.expenseId)!),
      row.description || ''
    ])
  ].map(row => row.map(escapeCsvCell).join(','))

  return `\ufeff${lines.join('\r\n')}`
}

export function downloadExport(content: string, format: ExportFormat) {
  const mimeType = format === 'json' ? 'application/json' : 'text/csv'
  const extension = format === 'json' ? 'json' : 'csv'
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `finfast-export.${extension}`
  link.click()
  URL.revokeObjectURL(url)
}