<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import ExportDialog from '@/components/ExportDialog.vue'
import ImportDialog from '@/components/ImportDialog.vue'
import LogoutConfirmationDialog from '@/components/LogoutConfirmationDialog.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import AccountDialog from '@/components/AccountDialog.vue'
import { format } from 'date-fns/format'
import { isAxiosError } from 'axios'

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
const showAccountDialog = ref(false)
const googleLinkMessage = ref('')
const googleLinkError = ref('')
const pendingExpensesCount = computed(() => expenseStore.getPendingExpensesCount())
const shouldShowLogin = computed(() => !authStore.isAuthenticated || authStore.isAnonymous)
const isGoogleSignInConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

const buildInfo = computed(() => {
  const buildNumber = import.meta.env.VITE_BUILD_NUMBER || 'dev'
  const gitCommit = import.meta.env.VITE_GIT_COMMIT || 'local'
  const shortCommit = gitCommit.length > 7 ? gitCommit.substring(0, 7) : gitCommit
  return `Build #${buildNumber} · ${shortCommit} · ${format(new Date(__BUILD_TIME__), 'yyyy.MM.dd. HH:mm')}`
})

watch(() => props.modelValue, v => (localOpen.value = v))
watch(localOpen, v => emit('update:modelValue', v))

onMounted(() => {
  if (authStore.accessToken && !authStore.isAnonymous) {
    void authStore.loadCurrentUser()
  }
})

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
  if (shouldShowLogin.value) {
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
  closeMenu()
  showLogoutDialog.value = false
  await authStore.logout()
  await router.replace({ name: 'login' })
}

async function goToLogin() {
  closeMenu()
  await authStore.logout()
  await router.replace({ name: 'login' })
}

function openAccountDialog() {
  closeMenu()
  showAccountDialog.value = true
}

async function linkGoogleAccount(credential: string) {
  googleLinkMessage.value = ''
  googleLinkError.value = ''
  try {
    await authStore.linkGoogleAccount(credential)
    googleLinkMessage.value = 'Аккаунт Google успешно привязан'
  } catch (error) {
    googleLinkError.value = getGoogleLinkErrorMessage(error)
  }
}

function getGoogleLinkErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    if (error.response?.status === 409) {
      return 'Этот аккаунт Google уже привязан к другому пользователю'
    }
  }

  return 'Не удалось привязать аккаунт Google. Попробуйте ещё раз.'
}

function handleGoogleLinkError(message: string) {
  googleLinkError.value = message
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
              <v-avatar class="menu-avatar" color="light-blue-lighten-5" size="46">
                <v-icon color="light-blue-darken-2" size="28">mdi-account</v-icon>
              </v-avatar>
              <div class="menu-user-info">
                <span class="menu-username">{{ authStore.username || 'Пользователь' }}</span>
              </div>
            </div>

            <div class="menu-content">
              <v-btn
                variant="text"
                class="menu-button"
                @click="openImport"
              >
                <template #prepend>
                  <v-icon class="menu-icon menu-icon-import">mdi-file-upload-outline</v-icon>
                </template>
                Импорт расходов
              </v-btn>

              <v-btn
                variant="text"
                class="menu-button"
                @click="openExport"
              >
                <template #prepend>
                  <v-icon class="menu-icon menu-icon-export">mdi-file-download-outline</v-icon>
                </template>
                Экспорт расходов
              </v-btn>

              <template v-if="authStore.isAuthenticated && !authStore.isAnonymous && !authStore.googleLinked && isGoogleSignInConfigured">
                <v-divider class="my-2" />
                <div class="google-link-label">Привязать аккаунт Google</div>
                <GoogleSignInButton
                  v-if="localOpen"
                  @credential="linkGoogleAccount"
                  @error="handleGoogleLinkError"
                />
                <v-alert v-if="googleLinkMessage" class="mt-3" density="compact" type="success" variant="tonal">
                  {{ googleLinkMessage }}
                </v-alert>
                <v-alert v-if="googleLinkError" class="mt-3" density="compact" type="error" variant="tonal">
                  {{ googleLinkError }}
                </v-alert>
              </template>

              <template v-if="authStore.isAuthenticated && !authStore.isAnonymous">
                <v-divider class="my-2" />
                <v-btn
                  variant="text"
                  class="menu-button"
                  @click="openAccountDialog"
                >
                  <template #prepend>
                    <v-icon class="menu-icon">mdi-account-cog-outline</v-icon>
                  </template>
                  Управление аккаунтом
                </v-btn>
              </template>
            </div>

            <div class="menu-footer">
              <v-btn
                variant="text"
                class="menu-button menu-button-logout"
                @click="logout"
              >
                <template #prepend>
                  <v-icon
                    :class="shouldShowLogin ? 'menu-icon menu-icon-login' : 'menu-icon menu-icon-logout'"
                  >
                    {{ shouldShowLogin ? 'mdi-login' : 'mdi-logout' }}
                  </v-icon>
                </template>
                {{ shouldShowLogin ? 'Войти' : 'Выйти' }}
              </v-btn>
              <div class="menu-build-info">{{ buildInfo }}</div>
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
    <AccountDialog v-model="showAccountDialog" />
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
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  color: #263238;
}

.menu-avatar {
  flex: 0 0 auto;
}

.menu-user-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-user-label {
  color: #78909c;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  overflow-y: auto;
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

.menu-icon {
  font-size: 24px;
}

.menu-icon-import {
  color: #1976d2;
}

.menu-icon-export {
  color: #2e7d32;
}

.menu-icon-login {
  color: #00897b;
}

.menu-icon-logout {
  color: #d32f2f;
}

.menu-button-logout {
  color: #263238;
}

.menu-button-logout:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
}

.menu-build-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 11px;
  color: #9e9e9e;
  text-align: center;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.google-link-label {
  margin: 12px 0 8px;
  color: #546e7a;
  font-size: 13px;
  font-weight: 600;
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
