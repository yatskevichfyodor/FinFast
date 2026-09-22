import { isValid, parse } from "date-fns"

export function formatMonthName(year: number, month: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1))
}

// Parse date string handling both ISO format and YYYY-MM-DD format
// Returns a Date object that represents the date in local timezone
export function parseDate(dateString: string | undefined | null): Date {
  if (!dateString) {
    return new Date()
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return parse(dateString, 'yyyy-MM-dd', new Date())
  }
  
  // Default to regular Date parsing for ISO format
  const date = new Date(dateString)
  return isValid(date) ? date : new Date(NaN)
}

// Convert YYYY.MM.DD to YYYY-MM-DD format
export function convertDotFormatToDashFormat(dotDate: string | null | undefined): string | undefined {
  if (!dotDate || typeof dotDate !== 'string') {
    return undefined
  }
  const parts = dotDate.split('.')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${year}-${month}-${day}`
  }
  return dotDate
}

// Convert YYYY-MM-DD to YYYY.MM.DD format
export function convertDashFormatToDotFormat(dashDate: string | null | undefined): string | null {
  if (!dashDate || typeof dashDate !== 'string') {
    return null
  }
  const parts = dashDate.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${year}.${month}.${day}`
  }
  return dashDate
}
