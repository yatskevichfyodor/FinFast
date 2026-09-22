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
