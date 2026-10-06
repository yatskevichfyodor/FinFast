import { computed, reactive, ref } from "vue";
import { categoryApi } from "@/services/api/categoryApi";
import {
  DEFAULT_CATEGORY_DISPLAY,
  SYSTEM_CATEGORIES,
} from "@/constants/categories";
import type {
  Category,
  CustomCategoryCreateDto,
  CustomCategoryInput,
  CustomCategory
} from "@/types/category";
import { customCategoryStorage } from "@/storage/indexedDB/customCategoryStorage";
import { useDataChangesStore } from ".";
import { createLatestOnly } from "@/utils/latestOnly";
import { createUserEntryStorage } from "@/utils/localStorage";
import { createCategorySyncService } from "@/services/categorySyncService";

export type CategoryStore = ReturnType<typeof createCategoryStore>;

const LOCAL_STORAGE_HIDDEN_SYSTEM_CATEGORIES_IDS =
  "finfast-hidden-system-categories";
const LOCAL_STORAGE_LAST_SYNC_DATETIME_KEY =
  "finfast-categories-last-sync-datetime";

export function createCategoryStore(userId: string) {
  const runLatest = createLatestOnly();
  const hiddenSystemCategoriesIdsStorage = createUserEntryStorage<string>(
    LOCAL_STORAGE_HIDDEN_SYSTEM_CATEGORIES_IDS,
    userId,
  );
  const categoriesLastSyncDatetimeStorage = createUserEntryStorage<string>(
    LOCAL_STORAGE_LAST_SYNC_DATETIME_KEY,
    userId,
  );
  const categorySyncService = createCategorySyncService(userId);

  const dataChangeStore = useDataChangesStore().value!;

  const customCategories = ref<CustomCategory[]>([]);
  const hiddenSystemCategoriesIds = ref<string[]>([]);
  const systemCategories = computed(() => {
    const hiddenIds = new Set(hiddenSystemCategoriesIds.value);

    return SYSTEM_CATEGORIES.map((category) => ({
      ...category,
      hidden: hiddenIds.has(category.id),
    }));
  });
  const categories = computed(() => [
    ...customCategories.value.map((it) => ({
      ...it,
      system: false,
      hidden: !!it.hiddenAt,
    })),
    ...systemCategories.value,
  ]);
  const availableCategories = computed(() =>
    categories.value.filter((it) => !it.hidden),
  );

  /**
   * @returns saved version of dataChangesStore.dataChanges.CATEGORY
   */
  function getLastSyncDatetime(): Date | undefined {
    const lastSyncDatetimeString = categoriesLastSyncDatetimeStorage.get();
    if (!lastSyncDatetimeString) return undefined;
    const lastSyncDatetime = new Date(lastSyncDatetimeString);
    return Number.isNaN(lastSyncDatetime.getTime())
      ? undefined
      : lastSyncDatetime;
  }

  function getServerLastCategoryChangeDatetime(): Date | undefined {
    const serverLastCategoryChangeDatetimeString =
      dataChangeStore.dataChanges?.CATEGORY?.changedAt;
    return serverLastCategoryChangeDatetimeString
      ? new Date(serverLastCategoryChangeDatetimeString)
      : undefined;
  }

  function serverHasNewerData(
    lastSyncDatetime?: Date,
    serverLastCategoryChangeDatetime?: Date,
  ): boolean {
    return (
      lastSyncDatetime?.getTime() !==
      serverLastCategoryChangeDatetime?.getTime()
    );
  }

  async function loadDataFromStorage() {
    customCategories.value = await customCategoryStorage.loadCategories(userId);
    hiddenSystemCategoriesIds.value = getHiddenSystemCategoriesIdsFromStorage();
  }

  function getHiddenSystemCategoriesIdsFromStorage(): string[] {
    const hiddentSystemCategoriesIdsString =
      hiddenSystemCategoriesIdsStorage.get();
    return hiddentSystemCategoriesIdsString
      ? hiddentSystemCategoriesIdsString.split(",")
      : [];
  }

  function saveCustomCategoriesToStorage() {
    customCategoryStorage.saveCategories(userId, customCategories.value);
  }

  function saveHiddenSystemCategoriesIdsToStorage() {
    hiddenSystemCategoriesIdsStorage.save(
      hiddenSystemCategoriesIds.value
        ? hiddenSystemCategoriesIds.value.join(",")
        : "",
    );
  }

  async function syncLocalChangesWithApi() {
    await categorySyncService.sendPendingOperations();
    await loadDataFromApi();
  }

  async function loadDataFromApi() {
    const lastSyncDatetime = getLastSyncDatetime();
    const serverLastCategoryChangeDatetime =
      getServerLastCategoryChangeDatetime();
    if (
      serverHasNewerData(lastSyncDatetime, serverLastCategoryChangeDatetime)
    ) {
      const apiDataReceived = await loadCategoriesFromApi();
      if (apiDataReceived) {
        categoriesLastSyncDatetimeStorage.save(
          serverLastCategoryChangeDatetime
            ? serverLastCategoryChangeDatetime.toISOString()
            : "",
        );
      }
    }
  }

  /**
   * @returns true categories were updated with api data, else false
   */
  async function loadCategoriesFromApi(): Promise<boolean> {
    const apiCategoriesResult = await runLatest(() =>
      categoryApi
        .getCustomAndHiddenSystemCategories()
        .catch((error) => console.error("Failed to load categories:", error)),
    );

    if (apiCategoriesResult === undefined) {
      return false;
    }

    customCategories.value = apiCategoriesResult.customCategories;
    saveCustomCategoriesToStorage();
    hiddenSystemCategoriesIds.value =
      apiCategoriesResult.hiddenSystemCategoriesIds;
    saveHiddenSystemCategoriesIdsToStorage();
    return true;
  }

  async function createCustomCategory(input: CustomCategoryInput) {
    const localInput: CustomCategoryCreateDto = {
      ...input,
      id: crypto.randomUUID(),
    };
    const category = await categorySyncService.createCustomCategory(localInput);
    customCategories.value.push(category ?? localInput);
    saveCustomCategoriesToStorage();
  }

  async function updateCustomCategory(id: string, input: CustomCategoryInput) {
    const customCategory: CustomCategory = await categorySyncService.updateCustomCategory(id, input) ?? 
    {
      id: id,
      ...input
    };
    const index = customCategories.value.findIndex((it) => it.id === id);
    if (index >= 0) customCategories.value[index] = customCategory;
    saveCustomCategoriesToStorage();
  }

  async function hideCustomCategory(id: string) {
    await categorySyncService.hideCustomCategory(id);
    const category = customCategories.value.find((it) => it.id === id);
    if (category) category.hiddenAt = new Date().toISOString();
    saveCustomCategoriesToStorage();
  }

  async function removeCustomCategory(id: string) {
    await categorySyncService.deleteCustomCategory(id);
    customCategories.value = customCategories.value.filter(
      (it) => it.id !== id,
    );
    saveCustomCategoriesToStorage();
  }

  async function restoreCustomCategory(id: string) {
    await categorySyncService.restoreCustomCategory(id);
    const category = customCategories.value.find((it) => it.id === id);
    if (category) delete category.hiddenAt;
    saveCustomCategoriesToStorage();
  }

  async function hideSystemCategory(id: string) {
    await categorySyncService.hideSystemCategory(id);
    hiddenSystemCategoriesIds.value.push(id);
    saveHiddenSystemCategoriesIdsToStorage();
  }

  async function restoreSystemCategory(id: string) {
    await categorySyncService.restoreSystemCategory(id);
    hiddenSystemCategoriesIds.value = hiddenSystemCategoriesIds.value.filter(
      (it) => it != id,
    );
    saveHiddenSystemCategoriesIdsToStorage();
  }

  const categoryById = computed(() => {
    return new Map(categories.value.map((category) => [category.id, category]));
  });

  function getCategoryById(id: string | undefined): Category | undefined {
    return id ? categoryById.value.get(id) : undefined;
  }

  function getCategoryDisplay(id: string | undefined): Category {
    return getCategoryById(id) ?? DEFAULT_CATEGORY_DISPLAY;
  }

  return reactive({
    categories,
    systemCategories,
    customCategories,
    availableCategories,
    loadDataFromStorage,
    syncLocalChangesWithApi,
    createCustomCategory,
    updateCustomCategory,
    hideCustomCategory,
    removeCustomCategory,
    restoreCustomCategory,
    hideSystemCategory,
    restoreSystemCategory,
    getCategoryDisplay,
  });
}
