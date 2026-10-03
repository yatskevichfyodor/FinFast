<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import UserMenu from '@/components/UserMenu.vue'
import { updateAvailable } from '@/services/pwaUpdate'
import { useAuthStore } from './stores/authStore'
import { setExpenseStore, useExpenseStore } from './stores/expenseStoreContext'
import { pinia } from './stores'
import { buildPopularCategoryOrder } from './services/categoryPopularity'

const route = useRoute()
const showNavigation = computed(() => route.meta.requiresAuth === true)
const showUserMenu = ref(false)
const expenseStoreReady = ref(false)

const authStore = useAuthStore(pinia);

watch(
    () => authStore.userId,
    async (userId) => {
        setExpenseStore(userId);
        const expenseStore = useExpenseStore();
        if (expenseStore.value) {
          await expenseStore.value.init();
          expenseStoreReady.value = true;
          buildPopularCategoryOrder(expenseStore.value.expenses.value)
        }
    },
    { immediate: true },
);


</script>

<template>
  <v-app>
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