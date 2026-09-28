import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { categoryApi } from "@/services/api/categoryApi";
import {
  DEFAULT_CATEGORY_DISPLAY,
  SYSTEM_CATEGORIES,
} from "@/constants/categories";
import { useAuthStore } from "@/stores/authStore";
import type { Category, CategoryInput, CustomAndHiddenSystemCategoriesDto, CustomCategory } from "@/types/category";
import { customCategoryStorage } from "@/storage/indexedDB/customCategoryStorage";
import { useDataChangesStore } from "./dataChangesStore";
import { createStoreStateGuard } from "@/utils/storeStateGuard";
import hiddenSystemCategoryStorage from "@/storage/hiddenSystemCategoryStorage";

const LOCAL_STORAGE_LAST_SYNC_KEY = "finfast-categories-last-sync";

export const useCategoryStore = defineStore("category", () => {
  const authStore = useAuthStore();
  const dataChangeStore = useDataChangesStore();
  const storeStateGuard = createStoreStateGuard(() => authStore.userId);
  const customCategories = ref<Category[]>([]);
  const hiddenSystemCategoriesIds = ref<string[]>([]);
  const systemCategories = computed(() => {
    const hiddenIds = new Set(hiddenSystemCategoriesIds.value);

    return SYSTEM_CATEGORIES.map((category) => ({
      ...category,
      hidden: hiddenIds.has(category.id),
    }));
  });
  const categories = computed(() => [
    ...customCategories.value,
    ...systemCategories.value,
  ]);

  const availableCategories = computed(() =>
    categories.value.filter(
      (category) => !category.deleted && !category.hidden,
    ),
  );

  const getLastSyncKey = (userId: string) =>
    `${LOCAL_STORAGE_LAST_SYNC_KEY}:${userId}`;

  function getLastSyncDatetime(userId: string): Date | undefined {
    const lastSyncDatetimeString = localStorage.getItem(getLastSyncKey(userId));
    if (!lastSyncDatetimeString) return undefined;
    const lastSyncDatetime = new Date(lastSyncDatetimeString);
    return Number.isNaN(lastSyncDatetime.getTime())
      ? undefined
      : lastSyncDatetime;
  }

  function saveLastSyncDatetime(userId: string, datetime?: Date) {
    localStorage.setItem(
      getLastSyncKey(userId),
      datetime ? datetime.toISOString() : "",
    );
  }

  function getLastCategoryChangeDatetime(): Date | undefined {
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

  watch(
    () => authStore.userId,
    () => {
      void init();
    },
    { immediate: true },
  );

  async function init() {
    const currentUserId = authStore.userId;
    if (!currentUserId) return;
    const lastSyncDatetime = getLastSyncDatetime(currentUserId);
    const serverLastCategoryChangeDatetime = getLastCategoryChangeDatetime();
    if (
      serverHasNewerData(lastSyncDatetime, serverLastCategoryChangeDatetime)
    ) {
      const apiDataReceived = await loadCategories(currentUserId);
      if (apiDataReceived)
        saveLastSyncDatetime(currentUserId, serverLastCategoryChangeDatetime);
    }
  }

  /**
   * @returns true categories were updated with api data, else false
   */
  async function loadCategories(currentUserId: string): Promise<boolean> {
    let apiResult: CustomAndHiddenSystemCategoriesDto | undefined;

    const isCurrentState = await storeStateGuard(
      () =>
        categoryApi.getCustomAndHiddenSystemCategories().catch((error) => {
          console.error("Failed to load categories:", error);
          return undefined;
        }),
      (categories) => {
        apiResult = categories;
      },
    );
    if (!isCurrentState) return false;

    if (apiResult !== undefined) {
      customCategories.value = apiResult.customCategories;
      customCategoryStorage.saveCategories(currentUserId, apiResult.customCategories);
      hiddenSystemCategoriesIds.value = apiResult.hiddenSystemCategoriesIds;
      hiddenSystemCategoryStorage.save(currentUserId, apiResult.hiddenSystemCategoriesIds);
      return true;
    }

    customCategories.value = await customCategoryStorage.loadCategories(currentUserId)
    hiddenSystemCategoriesIds.value = hiddenSystemCategoryStorage.get(currentUserId);
    return false;
  }

  function saveCache() {
    customCategoryStorage.saveCategories(
      authStore.userId ?? "anonymous",
      customCategories.value,
    );
  }

  async function createCustomCategory(input: CategoryInput) {
    const localInput = { ...input, id: crypto.randomUUID() };
    const category = await categoryApi.createCustomCategory(localInput);
    customCategories.value.push(category);
    saveCache();
  }

  async function updateCustomCategory(id: string, input: CategoryInput) {
    let category: Category;
    category = await categoryApi.updateCustomCategory(id, input);
    const index = customCategories.value.findIndex((it) => it.id === id);
    if (index >= 0) customCategories.value[index] = category;
    saveCache();
  }

  async function removeCustomCategory(id: string) {
    await categoryApi.deleteCustomCategory(id);
    const category = customCategories.value.find((it) => it.id === id);
    if (category) category.deleted = true;
    saveCache();
  }

  async function restoreCustomCategory(id: string) {
    await categoryApi.restoreCustomCategory(id);
    const category = customCategories.value.find((it) => it.id === id);
    if (category) category.deleted = false;
    saveCache();
  }

  async function hideSystemCategory(id: string) {
    await categoryApi.hideSystemCategory(id);
    hiddenSystemCategoriesIds.value.push(id);
    saveCache();
  }

  async function restoreSystemCategory(id: string) {
    await categoryApi.restoreSystemCategory(id);
    hiddenSystemCategoriesIds.value = hiddenSystemCategoriesIds.value.filter(it => it != id);
    saveCache();
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

  return {
    categories, 
    availableCategories,
    init,
    loadCategories,
    createCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
    restoreCustomCategory,
    hideSystemCategory,
    restoreSystemCategory,
    getCategoryDisplay,
  };
});
