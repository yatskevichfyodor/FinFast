import { dataChangesClient } from "./http";

export interface DataChangeRecord {
    dataType: 'EXPENSE' | 'CATEGORY'
    changedAt: string
}

export const dataChangesApi = {
  async getTimestamps() {
    const { data } = await dataChangesClient.get<DataChangeRecord[]>("/user-data-changes");
    return data;
  }
};
