import type { Expense } from '@/types/expense'

interface ExpenseRecord {
  userId: string
  expenseId: string
  expense: Expense
}

// convert expenses playmentDate field from full ISO string to just the date part (YYYY-MM-DD)
export function migrateToV4(transaction: IDBTransaction) {
  const objectStore = transaction.objectStore('expenses')
  const request = objectStore.openCursor()

  request.onsuccess = () => {
    const cursor = request.result

    if (!cursor) {
      return
    }

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
    }

    cursor.continue()
  }
}