import { reactive, ref } from "vue";
import type { DataChangeRecord, StoreDataChanges } from "@/types/dataChange";
import { dataChangesApi } from "@/services/api/dataChangesApi";
import dataChangesStorage from "@/storage/dataChangesStorage";
import { createStoreStateGuard } from "@/utils/storeStateGuard";

function toStoreDto(apiDtos: DataChangeRecord[]): StoreDataChanges {
  return Object.fromEntries(
    apiDtos.map((dto) => [
      dto.dataType,
      {
        changedAt: dto.changedAt,
        syncRequired: false,
      },
    ]),
  ) as StoreDataChanges;
}

export type DataChangesStore = ReturnType<typeof createDataChangesStore>;

export function createDataChangesStore(userId: string) {
  const { storeStateGuard } = createStoreStateGuard();

  const dataChanges = ref<StoreDataChanges>();

  function loadDataFromStorage() {
    dataChanges.value = dataChangesStorage.get(userId);
    dataChanges.value ??= {};
    dataChanges.value.EXPENSE ??= {
      changedAt: undefined,
      syncRequired: true,
    };
    dataChanges.value.CATEGORY ??= {
      changedAt: undefined,
      syncRequired: true,
    };
    dataChanges.value.EXPENSE.syncRequired = true;
    dataChanges.value.CATEGORY.syncRequired = true;
  }

  async function loadDataFromApi() {
    let apiResult: StoreDataChanges | undefined;

    const isCurrentState = await storeStateGuard(
      () =>
        dataChangesApi
          .getTimestamps()
          .then(toStoreDto)
          .catch((error) => {
            console.error("Failed to load data changes:", error);
            return undefined;
          }),
      (apiDataChanges) => {
        apiResult = apiDataChanges;
      },
    );
    if (!isCurrentState) return;

    if (apiResult !== undefined) {
      dataChanges.value = apiResult;
      dataChangesStorage.save(userId, apiResult);
    }
  }

  return reactive({ 
    dataChanges,
    loadDataFromStorage,
    loadDataFromApi
  })
};
