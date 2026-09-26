import type { Expense } from '@/types/expense'

interface ExpenseRecord {
  userId: string
  expenseId: string
  expense: Expense
}

export function migrateToV5(transaction: IDBTransaction) {
  const objectStore = transaction.objectStore('expenses')
  const request = objectStore.openCursor()

  let processedCount = 0
  let migratedCount = 0

  console.info('[IndexedDB] Starting migration to v5')

  request.onsuccess = () => {
    const cursor = request.result

    if (!cursor) {
      console.info(
        `[IndexedDB] Migration to v5 completed: ${migratedCount} of ${processedCount} records migrated`
      )
      return
    }

    processedCount++

    const record = cursor.value as ExpenseRecord
    const paymentDate = record.expense.paymentDate

    if (
      typeof paymentDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(paymentDate)
    ) {
      cursor.update({
        ...record,
        expense: {
          ...record.expense,
          paymentDate: paymentDate.slice(0, 10)
        }
      })

      migratedCount++
    }

    cursor.continue()
  }

  request.onerror = () => {
    console.error(
      '[IndexedDB] Migration to v4 failed:',
      request.error
    )
  }
}