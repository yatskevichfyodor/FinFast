<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import UserMenu from '@/components/UserMenu.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const showNavigation = computed(() => route.meta.requiresAuth === true)
const showUserMenu = ref(false)
</script>

<template>
  <v-app>
    <RouterView />
    <template v-if="showNavigation">
      <AppNavigation />
      <div class="menu-button-container">
        <v-btn
          icon="mdi-menu"
          size="large"
          class="menu-button"
          title="Меню пользователя"
          aria-label="Меню пользователя"
          @click="showUserMenu = true"
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
  z-index: 2;
}

.menu-button {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 10px rgba(38, 50, 56, 0.1);
}

.sync-status {
  position: fixed;
  bottom: 72px;
  left: 16px;
  z-index: 2;
  max-width: min(360px, calc(100vw - 32px));
}

</style>