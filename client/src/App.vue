<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showNavigation = computed(() => route.meta.requiresAuth === true)

async function logout() {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <v-app>
    <RouterView />
    <template v-if="showNavigation">
      <AppNavigation />
      <v-btn
        class="logout-button"
        icon="mdi-logout"
        size="small"
        title="Выйти"
        @click="logout"
      />
    </template>
  </v-app>
</template>

<style scoped>
.logout-button {
  position: fixed;
  right: 16px;
  bottom: 76px;
  z-index: 2;
}
</style>