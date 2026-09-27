export interface DataChangeRecord {
  dataType: "EXPENSE" | "CATEGORY";
  changedAt: string;
}

export interface StoreDataChangeValues {
  changedAt?: string;
  syncRequired: boolean;
}

export type StoreDataChanges = Partial<
  Record<"EXPENSE" | "CATEGORY", StoreDataChangeValues>
>;
