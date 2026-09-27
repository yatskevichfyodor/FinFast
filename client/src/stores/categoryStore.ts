import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { categoryApi } from "@/services/api/categoryApi";
import {
  DEFAULT_CATEGORY_DISPLAY,
  SYSTEM_CATEGORIES,
} from "@/constants/categories";
import { useAuthStore } from "@/stores/authStore";
import type { Category, CategoryInput } from "@/types/category";
import { customCategoryStorage } from "@/storage/indexedDB/customCategoryStorage";
import { useDataChangeStore } from "./dataChangesStore";
import { createStoreStateGuard } from "@/utils/storeStateGuard";

const LOCAL_STORAGE_LAST_SYNC_KEY = "finfast-custom-categories-last-sync";

export const useCategoryStore = defineStore("category", () => {
  const authStore = useAuthStore();
  const dataChangeStore = useDataChangeStore();
  const storeStateGuard = createStoreStateGuard(() => authStore.userId);
  const categories = ref<Category[]>([]);
  const customCategories = ref<Category[]>([]);
  const availableCategories = computed(() =>
    categories.value.filter(
      (category) => !category.deleted && !category.hidden,
    ),
  );
  
  watch(
    () => authStore.userId,
    () => {
      void loadCustomCategories();
    },
    { immediate: true },
  );

  async function loadCustomCategories() {
    const currentUserId = authStore.userId;
    if (!currentUserId) return;
    let apiResult: Category[] | undefined;

    const isCurrentState = await storeStateGuard(
      () =>
        categoryApi.getAvailableCategories().catch((error) => {
          console.error("Failed to load categories:", error);
          return undefined;
        }),
      (categories) => {
        apiResult = categories;
      }
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
      categories.value,
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
    const index = customCategories.value.findIndex(it => it.id === id);
    if (index >= 0) categories.value[index] = category;
    saveCache();
  }

  async function remove(id: string) {
    await categoryApi.deleteCustomCategory(id);
    const category = categories.value.find(it => it.id === id);
    if (category) category.deleted = true;
    saveCache();
  }

  async function restore(id: string) {
    await categoryApi.restoreCategory(id);
    const category = categories.value.find(it => it.id === id);
    if (category) category.deleted = false;
    saveCache();
  }

  async function hideSystemCategory(id: string) {
    await categoryApi.hideSystemCategory(id);
    const category = categories.value.find(it => it.id === id);
    if (category) category.hidden = true;
    saveCache();
  }

  async function restoreSystem(id: string) {
    await categoryApi.restoreSystemCategory(id);
    const category = categories.value.find(it => it.id === id);
    if (category) category.hidden = false;
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
    loadCustomCategories,
    createCustomCategory,
    updateCustomCategory,
    remove,
    restore,
    hideSystem: hideSystemCategory,
    restoreSystem,
    getCategoryDisplay,
  };
});