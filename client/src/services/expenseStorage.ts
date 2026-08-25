import { toRaw } from 'vue'
import type { Expense } from '@/stores/expense'

const DATABASE_NAME = 'finfast'
const DATABASE_VERSION = 2
const STORE_NAME = 'expenses'

interface ExpenseRecord {
  userId: string
  expenseId: string
  expense: Expense
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: ['userId', 'expenseId']
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open expenses database'))
  })
}

export async function loadExpenses(userId: string): Promise<Expense[]> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const range = IDBKeyRange.bound([userId, ''], [userId, '\uffff'])
    const request = transaction.objectStore(STORE_NAME).getAll(range) as IDBRequest<ExpenseRecord[]>

    request.onsuccess = () => {
      database.close()
      resolve(request.result.map(record => record.expense))
    }
    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error('Failed to load expenses'))
    }
  })
}

export async function saveExpenses(userId: string, expenses: Expense[]): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const range = IDBKeyRange.bound([userId, ''], [userId, '\uffff'])
    const existingRequest = objectStore.getAll(range) as IDBRequest<ExpenseRecord[]>

    existingRequest.onsuccess = () => {
      const expensesById = new Map(expenses.map(expense => [expense.id, expense]))

      existingRequest.result.forEach(record => {
        if (!expensesById.has(record.expenseId)) {
          objectStore.delete([userId, record.expenseId])
        }
      })

      expenses.forEach(expense => {
        objectStore.put({
          userId,
          expenseId: expense.id,
          expense: toRaw(expense)
        } satisfies ExpenseRecord)
      })
    }
    existingRequest.onerror = () => {
      transaction.abort()
    }

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Failed to save expenses'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Failed to save expenses'))
    }
  })
}
