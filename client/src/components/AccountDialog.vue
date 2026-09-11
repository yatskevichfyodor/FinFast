<script setup lang="ts">
import { ref, computed } from 'vue'
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
const googleLinkMessage = ref('')
const googleLinkError = ref('')
const isGoogleSignInConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

function openProfileDialog() {
  editedUsername.value = authStore.username ?? ''
  accountError.value = ''
  showProfileDialog.value = true
}

function openPasswordDialog() {
  newPassword.value = ''
  accountError.value = ''
  showPasswordDialog.value = true
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
  <v-dialog :model-value="props.modelValue" max-width="500" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>Аккаунт</v-card-title>
      <v-card-text>
        <div class="account-details">
          <span class="account-detail-label">Имя пользователя</span>
          <span class="account-detail-value">{{ authStore.username }}</span>
          <span class="account-detail-label">Вход через Google</span>
          <span class="account-detail-value">{{ authStore.googleLinked ? 'Подключён' : 'Не подключён' }}</span>
        </div>
        <v-divider class="my-4" />
        
        <!-- Google Linking Section -->
        <template v-if="!authStore.googleLinked && isGoogleSignInConfigured">
          <div class="google-section">
            <div class="google-section-title">Привязать аккаунт Google</div>
            <GoogleSignInButton
              @credential="linkGoogleAccount"
              @error="handleGoogleLinkError"
            />
            <v-alert v-if="googleLinkMessage" class="mt-3" density="compact" type="success" variant="tonal">
              {{ googleLinkMessage }}
            </v-alert>
            <v-alert v-if="googleLinkError" class="mt-3" density="compact" type="error" variant="tonal">
              {{ googleLinkError }}
            </v-alert>
          </div>
          <v-divider class="my-4" />
        </template>

        <!-- Google Unlinking Section -->
        <template v-if="authStore.googleLinked">
          <div class="google-section">
            <div class="google-section-title">Управление Google</div>
            <v-btn
              v-if="!authStore.hasPassword"
              variant="text"
              class="account-action"
              @click="openPasswordDialog"
            >
              <template #prepend><v-icon>mdi-lock-outline</v-icon></template>
              Задать пароль
            </v-btn>
            <v-btn
              v-if="authStore.hasPassword"
              variant="text"
              class="account-action"
              @click="openUnlinkGoogleDialog"
            >
              <template #prepend><v-icon>mdi-google</v-icon></template>
              Отвязать Google
            </v-btn>
          </div>
          <v-divider class="my-4" />
        </template>

        <div class="account-actions">
          <v-btn variant="text" class="account-action" @click="openProfileDialog">
            <template #prepend><v-icon>mdi-pencil-outline</v-icon></template>
            Изменить имя
          </v-btn>
          <v-btn variant="text" class="account-action account-action-danger" @click="openDeleteAccountDialog">
            <template #prepend><v-icon>mdi-delete-outline</v-icon></template>
            Удалить аккаунт
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="emit('update:modelValue', false)">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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
</template>

<style scoped>
.account-details {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 12px;
  padding: 8px 4px;
  font-size: 14px;
}

.account-detail-label {
  color: #78909c;
}

.account-detail-value {
  max-width: 200px;
  overflow: hidden;
  color: #37474f;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-action {
  width: 100%;
  justify-content: flex-start;
  height: 44px;
  font-size: 14px;
  border-radius: 8px;
  text-transform: none;
}

.account-action-danger {
  color: #d32f2f;
}

.dialog-description {
  margin-bottom: 16px;
  color: #546e7a;
  line-height: 1.45;
}

.google-section {
  margin-bottom: 16px;
}

.google-section-title {
  margin-bottom: 12px;
  color: #546e7a;
  font-size: 14px;
  font-weight: 600;
}
</style>
