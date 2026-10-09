<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppNavigation from "@/components/AppNavigation.vue";
import UserMenu from "@/components/UserMenu.vue";
import { updateAvailable } from "@/services/pwaUpdate";
import { useAuthStore } from "./stores/authStore";
import {
  pinia,
  setCategoryOrderStore,
  setCategoryStore,
  setDataChangesStore,
  setExpenseStore,
  useCategoryOrderStore,
  useCategoryStore,
  useDataChangesStore,
  useExpenseStore,
} from "./stores";
import availabilityService from "./services/availabilityService";

const route = useRoute();
const showNavigation = computed(() => route.meta.requiresAuth === true);
const showUserMenu = ref(false);

const dataChangesStoreReady = ref(false);
const categoryStoreReady = ref(false);
const expenseStoreReady = ref(false);
const categoryOrderStoreReady = ref(false);
const storesReady = computed(
  () =>
    dataChangesStoreReady.value &&
    categoryStoreReady.value &&
    expenseStoreReady.value &&
    categoryOrderStoreReady.value,
);

const authStore = useAuthStore(pinia);
const dataChangesStore = useDataChangesStore();
const categoryStore = useCategoryStore();

// ping services to wake them up
if (!authStore.isOffline) {
  availabilityService.wakeUpServices();
}

async function refreshStores(userId: string | null) {
  setDataChangesStore(userId);
  if (dataChangesStore.value) {
    dataChangesStore.value.loadDataFromStorage();
    dataChangesStore.value.loadDataFromApi(); // without wating for completion
  }
  dataChangesStoreReady.value = true;

  setCategoryStore(userId);
  if (categoryStore.value) {
    await categoryStore.value.loadDataFromStorage();
    categoryStore.value.syncLocalChangesWithApi(); // without wating for completion
  }
  categoryStoreReady.value = true;

  setExpenseStore(userId);
  const expenseStore = useExpenseStore();
  if (expenseStore.value) {
    await expenseStore.value.loadDataFromStorage();
  }
  expenseStoreReady.value = true;

  setCategoryOrderStore(userId);
  const categoryOrderStore = useCategoryOrderStore();
  if (categoryOrderStore.value) {
    await categoryOrderStore.value.getCategoryOrder();
  }
  categoryOrderStoreReady.value = true;
}

watch(
  () => authStore.userId,
  async (userId) => {
    await refreshStores(userId);
  },
  { immediate: true },
);
</script>

<template>
  <v-app v-if="storesReady">
    <RouterView />
    <template v-if="showNavigation">
      <AppNavigation />
      <div class="menu-button-container">
        <v-badge v-if="updateAvailable" dot color="error" location="top right">
          <v-btn
            icon="mdi-menu"
            variant="text"
            size="x-small"
            class="menu-button"
            title="Меню пользователя"
            aria-label="Меню пользователя"
            @click="showUserMenu = !showUserMenu"
          />
        </v-badge>
        <v-btn
          v-else
          icon="mdi-menu"
          variant="text"
          size="x-small"
          class="menu-button"
          title="Меню пользователя"
          aria-label="Меню пользователя"
          @click="showUserMenu = !showUserMenu"
        />
      </div>
    </template>

    <UserMenu v-if="expenseStoreReady" v-model="showUserMenu" />
  </v-app>
</template>

<style scoped>
.menu-button-container {
  position: fixed;
  right: 16px;
  top: 16px;
  z-index: 2001;
}

.sync-status {
  position: fixed;
  bottom: 72px;
  left: 16px;
  z-index: 2;
  max-width: min(360px, calc(100vw - 32px));
}
</style>
