<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import { isAxiosError } from 'axios'
import * as expenseApi from '@/services/expenseApi'
import * as authApi from '@/services/authApi'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const expenseStore = useExpenseStore()

const showPasswordForm = ref(false)
const showUnlinkGoogleDialog = ref(false)
const showDeleteAccountDialog = ref(false)
const isEditingUsername = ref(false)
const editedUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const accountError = ref('')
const isSavingAccount = ref(false)
const isDeletingAccount = ref(false)
const deleteConfirmed = ref(false)
const googleLinkMessage = ref('')
const googleLinkError = ref('')
const isGoogleSignInConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

editedUsername.value = authStore.username ?? ''

watch(() => authStore.username, (newUsername) => {
  if (!isEditingUsername.value) {
    editedUsername.value = newUsername ?? ''
  }
})

function startEditingUsername() {
  editedUsername.value = authStore.username ?? ''
  isEditingUsername.value = true
  accountError.value = ''
}

function cancelEditingUsername() {
  editedUsername.value = authStore.username ?? ''
  isEditingUsername.value = false
  accountError.value = ''
}

function togglePasswordForm() {
  if (showPasswordForm.value) {
    showPasswordForm.value = false
    passwordError.value = ''
    return
  }

  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = ''
  showPasswordForm.value = true
}

function openUnlinkGoogleDialog() {
  accountError.value = ''
  showUnlinkGoogleDialog.value = true
}

function openDeleteAccountDialog() {
  accountError.value = ''
  deleteConfirmed.value = false
  showDeleteAccountDialog.value = true
}

async function saveUsername() {
  accountError.value = ''
  isSavingAccount.value = true
  try {
    await authStore.updateProfile(editedUsername.value)
    isEditingUsername.value = false
  } catch (error) {
    accountError.value = getRequestErrorMessage(error, 'Не удалось изменить имя пользователя')
  } finally {
    isSavingAccount.value = false
  }
}

async function savePassword() {
  passwordError.value = ''

  if (!newPassword.value) {
    passwordError.value = 'Введите пароль'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Пароли не совпадают'
    return
  }

  isSavingAccount.value = true
  try {
    await authStore.setPassword(newPassword.value)
    showPasswordForm.value = false
  } catch (error) {
    passwordError.value = getRequestErrorMessage(error, 'Не удалось сохранить пароль')
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
</script>

<template>
  <v-dialog :model-value="props.modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <v-card class="account-dialog">
      <div class="dialog-header">
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          color="white"
          class="close-btn"
          @click="emit('update:modelValue', false)"
        />
        <div class="header-avatar">
          <v-icon size="25" color="white">mdi-account-circle</v-icon>
        </div>
        <div class="header-title">Управление аккаунтом</div>
      </div>

      <v-card-text class="dialog-content">
        <div class="scrollable-content">
          <div class="info-sections">
          <!-- Username Card -->
          <div class="info-card">
            <div class="card-header">
              <v-icon class="card-icon" color="#1976d2">mdi-account</v-icon>
              <span class="card-label">Имя пользователя</span>
            </div>
            <div class="card-content">
              <div class="username-input-wrapper">
                <v-text-field
                  v-model="editedUsername"
                  :disabled="!isEditingUsername"
                  :readonly="!isEditingUsername"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="username-input"
                  :class="{ 'username-input-locked': !isEditingUsername }"
                />
                <div class="username-actions">
                  <template v-if="!isEditingUsername">
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="#1976d2"
                      class="edit-btn"
                      @click="startEditingUsername"
                    >
                      <v-icon size="16" start>mdi-pencil-outline</v-icon>
                      Изменить
                    </v-btn>
                  </template>
                  <template v-else>
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="#757575"
                      class="action-btn"
                      @click="cancelEditingUsername"
                    >
                      <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="#1976d2"
                      class="action-btn"
                      :loading="isSavingAccount"
                      :disabled="!editedUsername.trim()"
                      @click="saveUsername"
                    >
                      <v-icon size="16">mdi-check</v-icon>
                    </v-btn>
                  </template>
                </div>
              </div>
              <v-alert v-if="accountError" density="compact" type="error" variant="tonal" class="username-error">
                {{ accountError }}
              </v-alert>
            </div>
          </div>

          <!-- Password Card -->
          <div class="info-card">
            <div class="card-header">
              <v-icon class="card-icon" :color="authStore.hasPassword ? '#2e7d32' : '#9e9e9e'">mdi-lock-outline</v-icon>
              <span class="card-label">Пароль</span>
              <v-chip
                :color="authStore.hasPassword ? 'success' : 'default'"
                size="x-small"
                variant="tonal"
                class="status-chip"
              >
                {{ authStore.hasPassword ? 'Установлен' : 'Не установлен' }}
              </v-chip>
            </div>
            <div class="card-content">
              <v-btn
                block
                size="small"
                variant="tonal"
                color="#1976d2"
                class="password-action-btn"
                @click="togglePasswordForm"
              >
                <v-icon size="16" start>{{ showPasswordForm ? 'mdi-chevron-up' : (authStore.hasPassword ? 'mdi-lock-reset' : 'mdi-lock-plus-outline') }}</v-icon>
                {{ showPasswordForm ? 'Скрыть' : (authStore.hasPassword ? 'Изменить пароль' : 'Добавить пароль') }}
              </v-btn>
              <v-expand-transition>
                <div v-if="showPasswordForm" class="password-form">
                  <div class="password-hint">
                    <v-icon size="16">mdi-information-outline</v-icon>
                    <span>Пароль нужен для входа по имени пользователя и отвязки Google.</span>
                  </div>
                  <v-text-field
                    v-model="newPassword"
                    label="Новый пароль"
                    type="password"
                    autocomplete="new-password"
                    hide-details="auto"
                  />
                  <v-text-field
                    v-model="confirmPassword"
                    label="Подтверждение пароля"
                    type="password"
                    autocomplete="new-password"
                    hide-details="auto"
                  />
                  <v-alert v-if="passwordError" density="compact" type="error" variant="tonal">
                    {{ passwordError }}
                  </v-alert>
                  <div class="password-form-actions">
                    <v-btn variant="text" :disabled="isSavingAccount" @click="togglePasswordForm">Отмена</v-btn>
                    <v-btn color="primary" :loading="isSavingAccount" @click="savePassword">Сохранить</v-btn>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </div>

          <!-- Google Card -->
          <div class="info-card">
            <div class="card-header">
              <v-icon class="card-icon" :color="authStore.googleLinked ? '#4285f4' : '#9e9e9e'">mdi-google</v-icon>
              <span class="card-label">Google</span>
              <v-chip
                :color="authStore.googleLinked ? 'success' : 'default'"
                size="x-small"
                variant="tonal"
                class="status-chip"
              >
                {{ authStore.googleLinked ? 'Подключён' : 'Не подключён' }}
              </v-chip>
            </div>
            <div class="card-content">
              <template v-if="authStore.googleLinked && authStore.email">
                <div class="google-email-wrapper">
                  <div class="google-email-display">
                    <v-icon size="16" color="#757575" class="email-icon">mdi-email-outline</v-icon>
                    <span class="google-email">{{ authStore.email }}</span>
                  </div>
                  <div class="google-email-actions">
                    <v-btn
                      v-if="authStore.hasPassword"
                      size="small"
                      variant="tonal"
                      color="#d32f2f"
                      class="google-action-btn"
                      @click="openUnlinkGoogleDialog"
                    >
                      <v-icon size="16" start>mdi-link-variant-off</v-icon>
                      Отвязать
                    </v-btn>
                  </div>
                </div>
              </template>
              <template v-else-if="!authStore.googleLinked && isGoogleSignInConfigured">
                <div class="google-link-container">
                  <GoogleSignInButton
                    @credential="linkGoogleAccount"
                    @error="handleGoogleLinkError"
                  />
                </div>
              </template>
              <template v-else>
                <div class="google-placeholder">{{ authStore.googleLinked ? 'Email не указан' : 'Не подключён' }}</div>
              </template>
            </div>
          </div>
        </div>

        <!-- Google Alerts -->
        <div v-if="googleLinkMessage || googleLinkError" class="alerts-container">
          <v-alert v-if="googleLinkMessage" density="compact" type="success" variant="tonal" class="custom-alert">
            {{ googleLinkMessage }}
          </v-alert>
          <v-alert v-if="googleLinkError" density="compact" type="error" variant="tonal" class="custom-alert">
            {{ googleLinkError }}
          </v-alert>
        </div>

        <v-divider class="section-divider" />

        <!-- Danger Zone -->
        <div class="danger-zone">
          <div class="danger-header">
            <v-icon class="danger-icon" color="#d32f2f">mdi-alert-circle</v-icon>
            <span class="danger-label">Опасная зона</span>
          </div>
          <v-btn 
            variant="tonal" 
            color="#d32f2f" 
            class="delete-btn"
            @click="openDeleteAccountDialog"
          >
            <v-icon start>mdi-delete-outline</v-icon>
            Удалить аккаунт
          </v-btn>
        </div>
        </div>
      </v-card-text>
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
</template>

<style scoped>
.account-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #09204d 100%);
  padding: 20px 20px 16px;
  text-align: center;
  color: white;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

.header-avatar {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  backdrop-filter: blur(10px);
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.dialog-content {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.scrollable-content {
  padding: 24px 20px;
}

.info-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.info-card:hover {
  border-color: #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 20px;
}

.card-label {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  flex: 1;
}

.status-chip {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.username-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.username-input {
  flex: 1;
  min-width: 0;
}

.username-input-locked :deep(.v-field__input) {
  cursor: default;
  background-color: #f8f9fa;
}

.username-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  min-width: 36px;
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
}

.username-error {
  margin-top: 8px;
  border-radius: 8px;
  font-size: 13px;
}

.google-email-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: nowrap;
}

.google-email-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.email-icon {
  flex-shrink: 0;
}

.google-email {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  word-break: break-all;
}

.google-email-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.google-placeholder {
  font-size: 14px;
  color: #9e9e9e;
  font-style: italic;
}

.edit-btn {
  height: 32px;
  font-size: 13px;
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.3px;
}

.google-link-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-action-btn {
  height: 32px;
  font-size: 13px;
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.3px;
}

.password-action-btn {
  height: 36px;
  font-size: 13px;
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.3px;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.password-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: #757575;
  font-size: 12px;
  line-height: 1.4;
}

.password-hint .v-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: #9e9e9e;
}

.password-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.alerts-container {
  margin-bottom: 16px;
}

.custom-alert {
  border-radius: 8px;
  font-size: 13px;
}

.section-divider {
  margin: 20px 0;
  border-color: #e9ecef;
}

.danger-zone {
  background: #fff5f5;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #fed7d7;
}

.danger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.danger-icon {
  font-size: 18px;
}

.danger-label {
  font-size: 13px;
  font-weight: 600;
  color: #c53030;
  letter-spacing: 0.3px;
}

.delete-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.3px;
  font-weight: 500;
}

/* Custom scrollbar */
.dialog-content::-webkit-scrollbar {
  width: 6px;
}

.dialog-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.dialog-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
