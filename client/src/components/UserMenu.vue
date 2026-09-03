<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import ExportDialog from '@/components/ExportDialog.vue'
import ImportDialog from '@/components/ImportDialog.vue'
import LogoutConfirmationDialog from '@/components/LogoutConfirmationDialog.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const expenseStore = useExpenseStore()

const localOpen = ref(props.modelValue)
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const showLogoutDialog = ref(false)
const pendingExpensesCount = computed(() => expenseStore.getPendingExpensesCount())

watch(() => props.modelValue, v => (localOpen.value = v))
watch(localOpen, v => emit('update:modelValue', v))

function closeMenu() {
  localOpen.value = false
}

function openExport() {
  closeMenu()
  showExportDialog.value = true
}

function openImport() {
  closeMenu()
  showImportDialog.value = true
}

async function logout() {
  if (authStore.isAnonymous) {
    await goToLogin()
    return
  }

  if (pendingExpensesCount.value > 0) {
    closeMenu()
    showLogoutDialog.value = true
    return
  }

  await completeLogout()
}

async function completeLogout() {
  showLogoutDialog.value = false
  await authStore.logout()
  await router.replace({ name: 'login' })
}

async function goToLogin() {
  closeMenu()
  await authStore.logout()
  await router.replace({ name: 'login' })
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeMenu()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="menu-backdrop">
      <div
        v-show="localOpen"
        class="menu-backdrop"
        @click="handleBackdropClick"
      >
        <Transition name="menu-slide">
          <div v-show="localOpen" class="user-menu">
            <div class="menu-header">
              <span class="menu-username">{{ authStore.username || 'Пользователь' }}</span>
            </div>

            <div class="menu-content">
              <v-btn
                variant="text"
                prepend-icon="mdi-file-upload-outline"
                class="menu-button"
                @click="openImport"
              >
                Импорт расходов
              </v-btn>

              <v-btn
                variant="text"
                prepend-icon="mdi-file-download-outline"
                class="menu-button"
                @click="openExport"
              >
                Экспорт расходов
              </v-btn>
            </div>

            <div class="menu-footer">
              <v-btn
                variant="text"
                :prepend-icon="authStore.isAnonymous ? 'mdi-login' : 'mdi-logout'"
                class="menu-button menu-button-logout"
                @click="logout"
              >
                {{ authStore.isAnonymous ? 'Войти' : 'Выйти' }}
              </v-btn>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <ExportDialog v-model="showExportDialog" />
    <ImportDialog v-model="showImportDialog" />
    <LogoutConfirmationDialog
      v-model="showLogoutDialog"
      :pending-expenses-count="pendingExpensesCount"
      @confirm="completeLogout"
    />
  </Teleport>
</template>

<style scoped>
.menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.user-menu {
  width: 300px;
  max-width: 85vw;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  color: #263238;
}

.menu-username {
  font-size: 18px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.menu-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.menu-button {
  width: 100%;
  justify-content: flex-start;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  text-transform: none;
}

.menu-button-logout {
  color: #263238;
}

.menu-button-logout:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
}

/* Slide-in animation */
.menu-backdrop-enter-active,
.menu-backdrop-leave-active {
  transition: opacity 0.3s ease;
}

.menu-backdrop-enter-from,
.menu-backdrop-leave-to {
  opacity: 0;
}

.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: transform 0.3s ease;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 600px) {
  .user-menu {
    width: 280px;
  }

  .menu-username {
    max-width: 180px;
    font-size: 16px;
  }

  .menu-button {
    height: 44px;
    font-size: 15px;
  }
}
</style>
