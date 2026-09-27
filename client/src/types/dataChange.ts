export interface DataChangeRecord {
    dataType: 'EXPENSE' | 'CATEGORY'
    changedAt: string
}

export interface StoreDataChangeValues {
    dataType: 'EXPENSE' | 'CATEGORY'
    changedAt: string
    syncRequired: boolean
}

export type StoreDataChanges = Record<
  'EXPENSE' | 'CATEGORY',
  StoreDataChangeValues
>
