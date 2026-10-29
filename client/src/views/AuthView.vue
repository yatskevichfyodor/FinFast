<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { ANONYMOUS_MODE_ENABLED_KEY, ANONYMOUS_USER_ID, useAuthStore } from '@/stores/authStore'
import { expenseStorage } from '@/storage/indexedDB'
import { authApi } from '@/services/api/authApi'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { useExpenseStore } from '@/stores'
import { isGoogleSignInAvailable } from '@/utils/auth'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)
const isCheckingService = ref(false)
const isServiceAvailable = ref(true)
const anonymousExpensesCount = ref(0)
const showTransferDialog = ref(false)
const isSlowResponse = ref(false)
const loginAbortController = ref<AbortController | null>(null)
const showRetryButton = ref(false)

const isRegistration = computed(() => route.name === 'register')
const title = computed(() => isRegistration.value ? t('auth.register') : t('auth.login'))
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const isGoogleSignInConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
const isOfflineMode = computed(() =>
  !isRegistration.value && !isCheckingService.value && !isServiceAvailable.value
)

async function checkAuthService() {
  if (isRegistration.value) {
    return
  }

  isCheckingService.value = true
  isServiceAvailable.value = await authApi.isAvailable()
  isCheckingService.value = false
}

function getErrorMessage(error: any): string {
  debugger;
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return ''
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return t('auth.timeout')
    }

    if (!error.response) {
      return t('auth.noConnection')
    }

    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      if (responseMessage === 'Passkey authentication failed' && error.response.status === 401)
      return t('auth.passkeyWrong')
      if (error.response.status === 403) {
        return responseMessage
      }
    }

    if (error.response.status >= 500) {
      return t('auth.serverError')
    }

    if (error.response.status === 401) {
      return t('auth.wrongCredentials')
    }

    if (error.response.status === 403 && isRegistration.value) {
      return t('auth.demoForbidden')
    }

    if (error.response.status === 409 && isRegistration.value) {
      return t('auth.usernameExists')
    }
  }

  if (error.message) {
    return error.message;
  }

  return isRegistration.value
    ? t('auth.registrationError')
    : t('auth.wrongCredentials')
}

async function submit() {
  errorMessage.value = ''
  isSlowResponse.value = false
  showRetryButton.value = false

  if (!username.value.trim() || !password.value) {
    errorMessage.value = t('auth.fillCredentials')
    return
  }

  if (isRegistration.value && password.value !== confirmPassword.value) {
    errorMessage.value = t('auth.passwordsMismatch')
    return
  }

  isSubmitting.value = true
  loginAbortController.value = new AbortController()

  let slowResponseTimer: number | null = null

  if (!isRegistration.value) {
    slowResponseTimer = window.setTimeout(() => {
      if (isSubmitting.value) {
        isSlowResponse.value = true
      }
    }, 5000)
  }

  try {
    if (isRegistration.value) {
      await authStore.register(username.value, password.value)
      await router.push({ name: 'login', query: { registered: 'true' } })
    } else {
      await authStore.login(username.value, password.value, loginAbortController.value.signal)
      await continueAfterLogin()
    }
  } catch (error) {
    const errorMsg = getErrorMessage(error)
    if (errorMsg) {
      errorMessage.value = errorMsg
      showRetryButton.value = errorMsg === t('auth.timeout') || errorMsg === t('auth.noConnection')
    }
  } finally {
    if (slowResponseTimer !== null) {
      clearTimeout(slowResponseTimer)
    }
    isSubmitting.value = false
    isSlowResponse.value = false
    loginAbortController.value = null
  }
}

async function loginWithGoogle(credential: string) {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await authStore.loginWithGoogle(credential)
    await continueAfterLogin()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

async function loginWithPasskey() {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await authStore.loginWithPasskey(username.value.trim() || undefined)
    
    errorMessage.value = t('auth.passkeyDone')
    await continueAfterLogin()
  } catch (error) {
    console.error("Login with passkey error: ", errorMessage.value)
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

async function registerWithPasskey() {
  errorMessage.value = ''
  if (!username.value.trim()) {
    errorMessage.value = t('auth.passkeyUsername')
    return
  }
  isSubmitting.value = true
  try {
    await authStore.registerWithPasskey(username.value)
    await continueAfterLogin()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

function handleGoogleError(message: string) {
  errorMessage.value = message
}

async function continueAfterLogin() {
  if (localStorage.getItem(ANONYMOUS_MODE_ENABLED_KEY)) {
    anonymousExpensesCount.value = (await expenseStorage.loadExpenses(ANONYMOUS_USER_ID)).length
    authStore.clearAnonymousModeMarker()
  }

  if (anonymousExpensesCount.value > 0) {
    showTransferDialog.value = true
  } else {
    await router.push({ name: 'home' })
  }
}

async function continueWithoutAccount() {
  authStore.continueWithoutAccount()
  await router.push({ name: 'home' })
}

async function transferAnonymousExpenses() {
  errorMessage.value = ''
  try {
    const expenseStore = useExpenseStore().value!;
    await expenseStore.transferAnonymousExpenses()
    showTransferDialog.value = false
    await router.push({ name: 'home' })
  } catch {
    errorMessage.value = t('auth.transferError')
  }
}

async function skipTransfer() {
  showTransferDialog.value = false
  await router.push({ name: 'home' })
}

function cancelLogin() {
  if (loginAbortController.value) {
    loginAbortController.value.abort()
  }
}

onMounted(() => {
  void checkAuthService()
  
  // Show success message when account was deleted
  if (route.query.deleted === 'true') {
    successMessage.value = t('auth.registeredSuccess')
    router.replace({ name: 'login' })
  }
})
</script>

<template>
  <v-main class="auth-page">
    <v-container class="auth-container" max-width="440">
      <v-card
        class="auth-card pa-6"
        :class="{ 'auth-card--offline': isOfflineMode }"
        elevation="3"
      >
        <template v-if="isOfflineMode">
          <div class="offline-header">
            <div class="offline-icon" aria-hidden="true">
              <v-icon icon="mdi-wifi-off" size="28" />
            </div>
            <div class="offline-status">{{ t('auth.offline') }}</div>
          </div>

          <v-card-title class="offline-title">{{ t('auth.unavailable') }}</v-card-title>
          <p class="offline-description">
            {{ t('auth.local') }}
          </p>

          <div class="offline-details">
            <div class="offline-detail">
              <v-icon icon="mdi-content-save-outline" size="20" />
              <span>{{ t('auth.localSave') }}</span>
            </div>
            <div class="offline-detail offline-detail--transfer">
              <v-icon icon="mdi-account-sync-outline" size="20" />
              <span>{{ t('auth.transfer') }}</span>
            </div>
          </div>

          <v-btn
            class="offline-action"
            color="primary"
            block
            size="large"
            type="button"
            @click="continueWithoutAccount"
          >
            {{ t('auth.continue') }}
            <v-icon end icon="mdi-arrow-right" />
          </v-btn>
        </template>

        <template v-else>
        <v-card-title class="text-h5 text-center">{{ title }}</v-card-title>

        <v-alert
          v-if="isRegistration && isDemoMode"
          class="mt-4"
          type="info"
          variant="tonal"
        >
          {{ t('auth.demo') }}
        </v-alert>

        <v-alert
          v-if="route.query.registered === 'true' && !isRegistration"
          class="mt-4"
          type="success"
          variant="tonal"
        >
          {{ t('auth.registered') }}
        </v-alert>

        <v-alert v-if="successMessage" class="mt-4" type="success" variant="tonal">
          {{ successMessage }}
        </v-alert>

        <v-alert v-if="errorMessage" class="mt-4" type="error" variant="tonal">
          {{ errorMessage }}
        </v-alert>

        <v-alert
          v-if="isSlowResponse"
          class="mt-4"
          type="info"
          variant="tonal"
        >
          {{ t('auth.serverStarting') }}
        </v-alert>

        <v-alert
          v-if="!isRegistration && !isCheckingService && !isServiceAvailable"
          class="mt-4"
          type="warning"
          variant="tonal"
        >
          {{ t('auth.serviceWarning') }}<br/>
          {{ t('auth.continue') }}. {{ t('auth.local') }}<br/>
          {{ t('auth.transfer') }}
        </v-alert>

        <v-form class="mt-4" @submit.prevent="submit">
          <v-text-field
            v-if="!isOfflineMode"
            v-model="username"
            :label="t('auth.username')"
            autocomplete="username"
            autofocus
            required
          />
          <v-text-field
            v-if="!isOfflineMode"
            v-model="password"
            :label="t('auth.password')"
            type="password"
            :autocomplete="isRegistration ? 'new-password' : 'current-password'"
            required
          />
          <v-text-field
            v-if="isRegistration"
            v-model="confirmPassword"
            :label="t('auth.repeatPassword')"
            type="password"
            autocomplete="new-password"
            required
          />
          <v-btn
            v-if="!isOfflineMode"
            class="mt-2"
            color="primary"
            block
            type="submit"
            :loading="isSubmitting && !isSlowResponse"
            :disabled="isSubmitting && !isSlowResponse"
          >
            {{ isSubmitting ? t('auth.submit') : title }}
          </v-btn>

          <v-btn
            v-if="isSlowResponse"
            class="mt-2"
            block
            variant="outlined"
            color="grey"
            @click="cancelLogin"
          >
            {{ t('auth.cancel') }}
          </v-btn>

          <v-btn
            v-if="showRetryButton && !isSubmitting"
            class="mt-2"
            block
            color="primary"
            @click="submit"
          >
            {{ t('common.retry') }}
          </v-btn>
          <v-btn
            v-if="!isRegistration"
            class="mt-3"
            block
            variant="text"
            type="button"
            @click="continueWithoutAccount"
          >
            {{ t('auth.continue') }}
          </v-btn>
        </v-form>

        <template v-if="!isOfflineMode && !isCheckingService && isGoogleSignInConfigured && isGoogleSignInAvailable()">
          <div class="auth-divider"><span>{{ t('auth.googleOr') }}</span></div>
          <GoogleSignInButton
            @credential="loginWithGoogle"
            @error="handleGoogleError"
          />
        </template>

        <v-btn
          v-if="!isOfflineMode && (!isRegistration || !isDemoMode)"
          class="mt-3"
          block
          variant="outlined"
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="isRegistration ? registerWithPasskey() : loginWithPasskey()"
        >
          <v-icon start icon="mdi-fingerprint" />
          {{ isRegistration ? t('auth.registerPasskey') : t('auth.loginPasskey') }}
        </v-btn>

        <v-card-actions class="justify-center mt-3">
          <v-btn
            v-if="isRegistration && !isOfflineMode"
            variant="text"
            :to="{ name: 'login' }"
          >
            {{ t('auth.hasAccount') }}
          </v-btn>
          <template v-else-if="!isOfflineMode">
            <span class="auth-switch-label">{{ t('auth.noAccount') }}</span>
            <v-btn
              variant="text"
              class="auth-switch-link"
              color="primary"
              density="comfortable"
              :to="{ name: 'register' }"
            >
              {{ t('auth.registerAction') }}
            </v-btn>
          </template>
        </v-card-actions>
        </template>
      </v-card>
    </v-container>

    <v-dialog v-model="showTransferDialog" max-width="440" persistent>
      <v-card>
        <v-card-title>{{ t('auth.transferTitle') }}</v-card-title>
        <v-card-text>
          {{ t('auth.transferFound', { count: anonymousExpensesCount }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="skipTransfer">{{ t('auth.transferKeep') }}</v-btn>
          <v-btn color="primary" :loading="isSubmitting" @click="transferAnonymousExpenses">
            {{ t('auth.transferAction') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 10%, rgba(33, 150, 243, 0.13), transparent 32%),
    radial-gradient(circle at 88% 90%, rgba(3, 218, 198, 0.12), transparent 30%),
    #f6f8fb;
}

.auth-container {
  padding-top: 12vh;
}

.auth-card {
  border: 1px solid rgba(33, 150, 243, 0.08);
}

.auth-card--offline {
  overflow: hidden;
  padding: 32px !important;
  border-color: rgba(3, 150, 150, 0.18);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(241, 252, 250, 0.96));
}

.offline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.offline-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 16px;
  color: #00796b;
  background: #dff7f2;
}

.offline-status {
  color: #00796b;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.offline-title {
  max-width: 100%;
  overflow: visible;
  padding: 0;
  color: #16343a;
  font-size: 25px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

.offline-description {
  margin: 12px 0 24px;
  color: rgba(22, 52, 58, 0.68);
  font-size: 15px;
  line-height: 1.55;
}

.offline-details {
  display: grid;
  gap: 12px;
  margin-bottom: 28px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(223, 247, 242, 0.62);
}

.offline-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #28565b;
  font-size: 14px;
}

.offline-detail--transfer {
  align-items: flex-start;
}

.offline-detail--transfer span {
  line-height: 1.45;
}

.offline-detail .v-icon {
  flex: 0 0 auto;
  color: #00897b;
}

.offline-action {
  min-height: 48px;
  font-weight: 700;
  letter-spacing: 0;
}

.auth-switch-link {
  padding-inline: 6px;
  font-weight: 600;
  letter-spacing: 0;
}

.auth-switch-label {
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 13px;
}

.auth-divider::before,
.auth-divider::after {
  height: 1px;
  flex: 1;
  background: rgba(var(--v-theme-on-surface), 0.14);
  content: '';
}

@media (max-width: 600px) {
  .auth-container {
    padding-top: 8vh;
  }

  .auth-card--offline {
    padding: 24px !important;
  }

  .offline-title {
    font-size: 22px;
  }
}
</style>
