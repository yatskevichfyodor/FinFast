<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const expenseStore = useExpenseStore()
const showNavigation = computed(() => route.meta.requiresAuth === true)
const showLogoutDialog = ref(false)
const pendingExpensesCount = computed(() => expenseStore.getPendingExpensesCount())

const pendingExpensesMessage = computed(() => {
  const count = pendingExpensesCount.value
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? 'расходов'
    : lastDigit === 1
      ? 'расход'
      : lastDigit >= 2 && lastDigit <= 4
        ? 'расхода'
        : 'расходов'

  return `${count} ${word} не синхронизированы и останутся только на этом устройстве.`
})

async function logout() {
  if (pendingExpensesCount.value > 0) {
    showLogoutDialog.value = true
    return
  }

  await completeLogout()
}

async function completeLogout() {
  showLogoutDialog.value = false
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <v-app>
    <RouterView />
    <template v-if="showNavigation">
      <AppNavigation />
      <div class="user-actions">
        <span class="username">{{ authStore.username || 'Пользователь' }}</span>
        <v-btn
          icon="mdi-logout"
          size="small"
          title="Выйти"
          aria-label="Выйти"
          @click="logout"
        />
      </div>
    </template>

    <v-dialog v-model="showLogoutDialog" max-width="440" persistent>
      <v-card>
        <v-card-text class="logout-message">
          <strong>{{ pendingExpensesMessage }}</strong>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLogoutDialog = false">
            Остаться
          </v-btn>
          <v-btn color="primary" variant="flat" @click="completeLogout">
            Выйти
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.user-actions {
  position: fixed;
  right: 16px;
  top: 16px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 10px rgba(38, 50, 56, 0.1);
}

.username {
  max-width: 180px;
  overflow: hidden;
  color: #263238;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-message {
  color: #263238;
  line-height: 1.5;
}
</style>