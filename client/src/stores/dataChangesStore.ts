import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useAuthStore } from "./authStore";
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

export const useDataChangeStore = defineStore("data-changes", () => {
  const authStore = useAuthStore();
  const storeStateGuard = createStoreStateGuard(() => authStore.userId);

  const dataChanges = ref<StoreDataChanges>();

  watch(
    () => authStore.userId,
    () => {
      void loadDataChanges().catch((error) => {
        console.error("Failed to load data changes:", error);
      });
    },
    { immediate: true },
  );

  async function loadDataChanges() {
    const currentUserId = authStore.userId;
    if (!currentUserId) return;
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
      dataChangesStorage.save(currentUserId, apiResult);
      return;
    }

    dataChanges.value = dataChangesStorage.get(currentUserId);
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
});
