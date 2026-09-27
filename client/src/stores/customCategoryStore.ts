import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { categoryApi } from "@/services/api/categoryApi";
import { DEFAULT_CATEGORY_DISPLAY } from "@/constants/categories";
import { useAuthStore } from "@/stores/authStore";
import type { Category, CategoryInput } from "@/types/category";
import { customCategoryStorage } from "@/storage/indexedDB/customCategoryStorage";
import { useDataChangeStore } from "./dataChangesStore";
import { createStoreStateGuard } from "@/utils/storeStateGuard";

const LOCAL_STORAGE_LAST_SYNC_KEY = "finfast-custom-categories-last-sync";

export const useCustomCategoryStore = defineStore("custom-categories", () => {
  const authStore = useAuthStore();
  const dataChangeStore = useDataChangeStore();
  const storeStateGuard = createStoreStateGuard(() => authStore.userId);
  const customCategories = ref<Category[]>([]);

  const getKey = (userId: string) => `${LOCAL_STORAGE_LAST_SYNC_KEY}:${userId}`;

  function getLastSyncDatetime(userId: string): Date | undefined {
    const lastSyncDatetimeString = localStorage.getItem(getKey(userId));
    if (!lastSyncDatetimeString) return undefined;
    const lastSyncDatetime = new Date(lastSyncDatetimeString);
    return Number.isNaN(lastSyncDatetime.getTime())
      ? undefined
      : lastSyncDatetime;
  }

  function saveLastSyncDatetime(userId: string, datetime?: Date) {
    localStorage.setItem(getKey(userId), datetime ? datetime.toISOString() : '');
  }

  function getLastCategoryChangeDatetime(): Date | undefined {
    const serverLastCategoryChangeDatetimeString =
      dataChangeStore.dataChanges?.CATEGORY?.changedAt;
    return serverLastCategoryChangeDatetimeString
      ? new Date(serverLastCategoryChangeDatetimeString)
      : undefined;
  }

  function serverHasNewerData(lastSyncDatetime?: Date, serverLastCategoryChangeDatetime?: Date): boolean {
    return lastSyncDatetime?.getTime() !== serverLastCategoryChangeDatetime?.getTime();
  }

  watch(
    () => authStore.userId,
    () => {
      void loadCustomCategoriesIfNeeded();
    },
    { immediate: true },
  );

  async function loadCustomCategoriesIfNeeded() {
    const currentUserId = authStore.userId;
    if (!currentUserId) return;
    const lastSyncDatetime = getLastSyncDatetime(currentUserId);
    const serverLastCategoryChangeDatetime = getLastCategoryChangeDatetime();
    if (serverHasNewerData(lastSyncDatetime, serverLastCategoryChangeDatetime)) {
        loadCustomCategories(currentUserId);
        saveLastSyncDatetime(currentUserId, lastSyncDatetime)
    }
  }

  async function loadCustomCategories(currentUserId: string) {
    let apiResult: Category[] | undefined;

    const isCurrentState = await storeStateGuard(
      () =>
        categoryApi.getAvailableCategories().catch((error) => {
          console.error("Failed to load categories:", error);
          return undefined;
        }),
      (categories) => {
        apiResult = categories;
      },
    );
    if (!isCurrentState) return;

    if (apiResult !== undefined) {
      customCategories.value = apiResult;
      customCategoryStorage.saveCategories(currentUserId, apiResult);
      return;
    }
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
    await categoryApi.restoreCategory(id);
    const category = customCategories.value.find((it) => it.id === id);
    if (category) category.deleted = false;
    saveCache();
  }

  const customCategoryById = computed(() => {
    return new Map(
      customCategories.value.map((category) => [category.id, category]),
    );
  });

  function getCategoryById(id: string | undefined): Category | undefined {
    return id ? customCategoryById.value.get(id) : undefined;
  }

  function getCategoryDisplay(id: string | undefined): Category {
    return getCategoryById(id) ?? DEFAULT_CATEGORY_DISPLAY;
  }

  return {
    customCategories,
    loadCustomCategories,
    createCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
    restoreCustomCategory,
    getCategoryDisplay,
  };
});
