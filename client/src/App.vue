<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import UserMenu from '@/components/UserMenu.vue'
import { updateAvailable } from '@/services/pwaUpdate'

const route = useRoute()
const showNavigation = computed(() => route.meta.requiresAuth === true)
const showUserMenu = ref(false)
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

    <UserMenu v-model="showUserMenu" />
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