import type { DataChangeRecord } from "@/types/dataChange";
import { dataChangesClient } from "./http";

export const dataChangesApi = {
  async getTimestamps(): Promise<DataChangeRecord[]> {
    const { data } = await dataChangesClient.get<DataChangeRecord[]>("/user-data-changes");
    return data;
  }
};
