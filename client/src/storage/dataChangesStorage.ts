import type { StoreDataChanges } from "@/types/dataChange"

const DATA_CHANGES_KEY = 'finfast-data-changes'

const getKey = (userId: string) => `${DATA_CHANGES_KEY}:${userId}`;

export default {
  get(userId: string): StoreDataChanges | undefined {
    const data = localStorage.getItem(getKey(userId))
    return data ? JSON.parse(data) : undefined
  },

  save(userId: string, dataChanges: StoreDataChanges): void {
    localStorage.setItem(getKey(userId), JSON.stringify(dataChanges))
  }
}