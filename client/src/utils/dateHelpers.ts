export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) {
    return ''
  }
  const date = parseDate(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  })
}

export function formatTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return ''
  }
  const date = parseDate(dateString)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
  
  // Check if it's YYYY-MM-DD format without timezone
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch

    if (year && month && day) {
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }
  
  // Default to regular Date parsing for ISO format
  return new Date(dateString)
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
