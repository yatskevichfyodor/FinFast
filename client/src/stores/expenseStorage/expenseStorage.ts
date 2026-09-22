import { toRaw } from 'vue'
import type { Expense } from '@/types/expense'
import { migrateToV4 } from './migrations/v4'

const DATABASE_NAME = 'finfast'
const DATABASE_VERSION = 4
const STORE_NAME = 'expenses'

interface ExpenseRecord {
  userId: string
  expenseId: string
  expense: Expense
}

export const expenseStorage = {
  async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = (event) => {
        const database = request.result
        const transaction = request.transaction
        const oldVersion = event.oldVersion

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, {
            keyPath: ['userId', 'expenseId']
          })
        }

        if (oldVersion < 4 && transaction) {
          migrateToV4(transaction)
        }

        // add future migrations here like this:
        // if (oldVersion < 5) {
        //     migrateToV5(transaction)
        // }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open expenses database'))
    })
  },

  async loadExpenses(userId: string): Promise<Expense[]> {
    const database = await this.openDatabase()

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
  },

  async saveExpenses(userId: string, expenses: Expense[]): Promise<void> {
    const database = await this.openDatabase()

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
  },

  async deleteExpenses(userId: string): Promise<void> {
    await this.saveExpenses(userId, [])
  }
}