import type { Expense } from '@/types/expense'
import { getCategoryDisplay } from '@/utils/categoryHelpers'

export type ExportFormat = 'json' | 'csv'

interface ExportRow {
  expenseId: string
  amount: number
  categoryId?: string
  createdAt: string
  date: string
  category: string
}

interface JsonExport {
  format: 'finfast'
  version: 1
  expenses: Array<Pick<ExportRow, 'expenseId' | 'amount' | 'categoryId' | 'createdAt'>>
}

function toExportRows(expenses: Expense[]): ExportRow[] {
  return expenses
    .filter(expense => !expense.isDeleted)
    .map(expense => ({
      expenseId: expense.id,
      amount: expense.amount,
      categoryId: expense.categoryId,
      createdAt: expense.createdAt,
      date: new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(expense.createdAt)).replace(', ', ' '),
      category: getCategoryDisplay(expense.categoryId).name
    }))
}

export function createJsonExport(expenses: Expense[]): string {
  const rows = toExportRows(expenses)
  const payload: JsonExport = {
    format: 'finfast',
    version: 1,
    expenses: rows.map(({ expenseId, amount, categoryId, createdAt }) => ({
      expenseId,
      amount,
      categoryId,
      createdAt
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

export function createCsvExport(expenses: Expense[]): string {
  const rows = toExportRows(expenses)
  const header = ['Дата', 'Сумма', 'Категория']
  const lines = [
    header,
    ...rows.map(row => [row.date, row.amount.toFixed(2), row.category])
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