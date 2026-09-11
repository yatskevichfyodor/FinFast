<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import ExportDialog from '@/components/ExportDialog.vue'
import ImportDialog from '@/components/ImportDialog.vue'
import LogoutConfirmationDialog from '@/components/LogoutConfirmationDialog.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { format } from 'date-fns/format'
import { isAxiosError } from 'axios'
import * as expenseApi from '@/services/expenseApi'
import * as authApi from '@/services/authApi'

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
const googleLinkMessage = ref('')
const googleLinkError = ref('')
const showProfileDialog = ref(false)
const showPasswordDialog = ref(false)
const showUnlinkGoogleDialog = ref(false)
const showDeleteAccountDialog = ref(false)
const editedUsername = ref('')
const newPassword = ref('')
const accountError = ref('')
const isSavingAccount = ref(false)
const isDeletingAccount = ref(false)
const deleteConfirmed = ref(false)
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

function openProfileDialog() {
  editedUsername.value = authStore.username ?? ''
  accountError.value = ''
  closeMenu()
  showProfileDialog.value = true
}

function openPasswordDialog() {
  newPassword.value = ''
  accountError.value = ''
  closeMenu()
  showPasswordDialog.value = true
}

function openUnlinkGoogleDialog() {
  accountError.value = ''
  closeMenu()
  showUnlinkGoogleDialog.value = true
}

function openDeleteAccountDialog() {
  accountError.value = ''
  deleteConfirmed.value = false
  closeMenu()
  showDeleteAccountDialog.value = true
}

async function saveUsername() {
  accountError.value = ''
  isSavingAccount.value = true
  try {
    await authStore.updateProfile(editedUsername.value)
    showProfileDialog.value = false
  } catch (error) {
    accountError.value = getRequestErrorMessage(error, 'Не удалось изменить имя пользователя')
  } finally {
    isSavingAccount.value = false
  }
}

async function savePassword() {
  accountError.value = ''
  isSavingAccount.value = true
  try {
    await authStore.setPassword(newPassword.value)
    showPasswordDialog.value = false
  } catch (error) {
    accountError.value = getRequestErrorMessage(error, 'Не удалось сохранить пароль')
  } finally {
    isSavingAccount.value = false
  }
}

async function unlinkGoogleAccount() {
  accountError.value = ''
  isSavingAccount.value = true
  try {
    await authStore.unlinkGoogleAccount()
    showUnlinkGoogleDialog.value = false
  } catch (error) {
    accountError.value = getRequestErrorMessage(error, 'Не удалось отвязать аккаунт Google')
  } finally {
    isSavingAccount.value = false
  }
}

async function deleteAccount() {
  if (!deleteConfirmed.value) {
    return
  }

  accountError.value = ''
  isDeletingAccount.value = true
  try {
    await expenseApi.deleteAllExpenses()
    await authApi.deleteAccount()
    await expenseStore.clearCurrentUserExpenses()
    showDeleteAccountDialog.value = false
    await authStore.logout()
    await router.replace({ name: 'login' })
  } catch (error) {
    accountError.value = getRequestErrorMessage(error, 'Не удалось удалить аккаунт')
  } finally {
    isDeletingAccount.value = false
  }
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
  return getRequestErrorMessage(error, 'Не удалось привязать аккаунт Google. Попробуйте ещё раз.', 409,
    'Этот аккаунт Google уже привязан к другому пользователю')
}

function getRequestErrorMessage(
  error: unknown,
  fallback: string,
  expectedStatus?: number,
  expectedStatusMessage?: string
): string {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    if (error.response?.status === expectedStatus && expectedStatusMessage) {
      return expectedStatusMessage
    }
  }

  return fallback
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
                <section class="account-section">
                  <div class="account-section-title">Аккаунт</div>
                  <div class="account-details">
                    <span class="account-detail-label">Имя пользователя</span>
                    <span class="account-detail-value">{{ authStore.username }}</span>
                    <span class="account-detail-label">Вход через Google</span>
                    <span class="account-detail-value">{{ authStore.googleLinked ? 'Подключён' : 'Не подключён' }}</span>
                  </div>
                  <v-btn variant="text" class="menu-button account-action" @click="openProfileDialog">
                    <template #prepend><v-icon>mdi-pencil-outline</v-icon></template>
                    Изменить имя
                  </v-btn>
                  <v-btn
                    v-if="authStore.googleLinked && !authStore.hasPassword"
                    variant="text"
                    class="menu-button account-action"
                    @click="openPasswordDialog"
                  >
                    <template #prepend><v-icon>mdi-lock-outline</v-icon></template>
                    Задать пароль
                  </v-btn>
                  <v-btn
                    v-if="authStore.googleLinked && authStore.hasPassword"
                    variant="text"
                    class="menu-button account-action"
                    @click="openUnlinkGoogleDialog"
                  >
                    <template #prepend><v-icon>mdi-google</v-icon></template>
                    Отвязать Google
                  </v-btn>
                  <v-btn variant="text" class="menu-button account-action account-action-danger" @click="openDeleteAccountDialog">
                    <template #prepend><v-icon>mdi-delete-outline</v-icon></template>
                    Удалить аккаунт
                  </v-btn>
                </section>
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
    <v-dialog v-model="showProfileDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>Изменить имя пользователя</v-card-title>
        <v-card-text>
          <v-text-field v-model="editedUsername" label="Имя пользователя" autocomplete="username" />
          <v-alert v-if="accountError" density="compact" type="error" variant="tonal">{{ accountError }}</v-alert>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="isSavingAccount" @click="showProfileDialog = false">Отмена</v-btn><v-btn color="primary" :loading="isSavingAccount" @click="saveUsername">Сохранить</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showPasswordDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>Задать пароль</v-card-title>
        <v-card-text>
          <p class="dialog-description">Пароль позволит безопасно отвязать Google и входить по имени пользователя.</p>
          <v-text-field v-model="newPassword" label="Пароль" type="password" autocomplete="new-password" />
          <v-alert v-if="accountError" density="compact" type="error" variant="tonal">{{ accountError }}</v-alert>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="isSavingAccount" @click="showPasswordDialog = false">Отмена</v-btn><v-btn color="primary" :loading="isSavingAccount" @click="savePassword">Сохранить</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showUnlinkGoogleDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>Отвязать Google?</v-card-title>
        <v-card-text>После этого вход через Google станет недоступен. Вы сможете войти по имени пользователя и паролю.</v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="isSavingAccount" @click="showUnlinkGoogleDialog = false">Отмена</v-btn><v-btn color="primary" :loading="isSavingAccount" @click="unlinkGoogleAccount">Отвязать</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showDeleteAccountDialog" max-width="440" persistent>
      <v-card>
        <v-card-title>Удалить аккаунт?</v-card-title>
        <v-card-text>
          <p class="dialog-description">Будут безвозвратно удалены аккаунт и все расходы, сохранённые на сервере.</p>
          <v-checkbox v-model="deleteConfirmed" color="error" label="Я понимаю, что отменить это действие нельзя" hide-details />
          <v-alert v-if="accountError" class="mt-3" density="compact" type="error" variant="tonal">{{ accountError }}</v-alert>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="isDeletingAccount" @click="showDeleteAccountDialog = false">Отмена</v-btn><v-btn color="error" :disabled="!deleteConfirmed" :loading="isDeletingAccount" @click="deleteAccount">Удалить навсегда</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
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

.account-section { display: flex; flex-direction: column; gap: 4px; }
.account-section-title { margin: 8px 0 4px; color: #37474f; font-size: 14px; font-weight: 700; }
.account-details { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 8px 4px; font-size: 13px; }
.account-detail-label { color: #78909c; }
.account-detail-value { max-width: 150px; overflow: hidden; color: #37474f; font-weight: 600; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.account-action { height: 40px; font-size: 14px; }
.account-action-danger { color: #d32f2f; }
.dialog-description { margin-bottom: 16px; color: #546e7a; line-height: 1.45; }

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
