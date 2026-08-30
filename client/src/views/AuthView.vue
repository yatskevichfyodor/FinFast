<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import { loadExpenses as loadStoredExpenses } from '@/services/expenseStorage'
import * as authApi from '@/services/authApi'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const expenseStore = useExpenseStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isCheckingService = ref(false)
const isServiceAvailable = ref(true)
const anonymousExpensesCount = ref(0)
const showTransferDialog = ref(false)
const isSlowResponse = ref(false)
const loginAbortController = ref<AbortController | null>(null)
const showRetryButton = ref(false)

const isRegistration = computed(() => route.name === 'register')
const title = computed(() => isRegistration.value ? 'Регистрация' : 'Вход')
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

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return ''
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Сервер не отвечает. Возможно, сервер ещё запускается.'
    }

    if (!error.response) {
      return 'Сервер недоступен. Проверьте подключение к интернету.'
    }

    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      return responseMessage
    }

    if (error.response.status >= 500) {
      return 'Сервер временно недоступен. Попробуйте позже.'
    }

    if (error.response.status === 401) {
      return 'Неверный логин или пароль'
    }
  }

  return isRegistration.value
    ? 'Не удалось зарегистрироваться'
    : 'Неверный логин или пароль'
}

async function submit() {
  errorMessage.value = ''
  isSlowResponse.value = false
  showRetryButton.value = false

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Заполните логин и пароль'
    return
  }

  if (isRegistration.value && password.value !== confirmPassword.value) {
    errorMessage.value = 'Пароли не совпадают'
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
      const profileId = localStorage.getItem('finfast-anonymous-profile')
      if (profileId) {
        anonymousExpensesCount.value = (await loadStoredExpenses(`anonymous:${profileId}`)).length
      }

      if (anonymousExpensesCount.value > 0) {
        showTransferDialog.value = true
      } else {
        await router.push({ name: 'home' })
      }
    }
  } catch (error) {
    const errorMsg = getErrorMessage(error)
    if (errorMsg) {
      errorMessage.value = errorMsg
      showRetryButton.value = errorMsg.includes('Сервер не отвечает') || errorMsg.includes('Сервер недоступен')
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

async function continueWithoutAccount() {
  authStore.continueWithoutAccount()
  await router.push({ name: 'home' })
}

async function transferAnonymousExpenses() {
  errorMessage.value = ''
  try {
    await expenseStore.transferAnonymousExpenses()
    showTransferDialog.value = false
    await router.push({ name: 'home' })
  } catch {
    errorMessage.value = 'Не удалось перенести расходы. Попробуйте ещё раз.'
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
            <div class="offline-status">Оффлайн-режим</div>
          </div>

          <v-card-title class="offline-title">Сервис авторизации временно недоступен</v-card-title>
          <p class="offline-description">
            Вы можете продолжить работу с расходами на этом устройстве.
          </p>

          <div class="offline-details">
            <div class="offline-detail">
              <v-icon icon="mdi-content-save-outline" size="20" />
              <span>Данные сохранятся локально</span>
            </div>
            <div class="offline-detail offline-detail--transfer">
              <v-icon icon="mdi-account-sync-outline" size="20" />
              <span>Когда соединение восстановится, войдите в аккаунт — мы предложим перенести сохранённые расходы.</span>
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
            Продолжить без аккаунта
            <v-icon end icon="mdi-arrow-right" />
          </v-btn>
        </template>

        <template v-else>
        <v-card-title class="text-h5 text-center">{{ title }}</v-card-title>

        <v-alert
          v-if="route.query.registered === 'true' && !isRegistration"
          class="mt-4"
          type="success"
          variant="tonal"
        >
          Регистрация завершена. Войдите в аккаунт.
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
          Сервер запускается. Первый запуск может занять до минуты.
        </v-alert>

        <v-alert
          v-if="!isRegistration && !isCheckingService && !isServiceAvailable"
          class="mt-4"
          type="warning"
          variant="tonal"
        >
          Не удалось подключиться к сервису авторизации.<br/>
          Можно продолжить без аккаунта. Ваши расходы сохранятся на этом устройстве.<br/>
          Когда соединение восстановится, войдите в аккаунт — мы предложим перенести сохранённые расходы.
        </v-alert>

        <v-form class="mt-4" @submit.prevent="submit">
          <v-text-field
            v-if="!isOfflineMode"
            v-model="username"
            label="Логин"
            autocomplete="username"
            autofocus
            required
          />
          <v-text-field
            v-if="!isOfflineMode"
            v-model="password"
            label="Пароль"
            type="password"
            :autocomplete="isRegistration ? 'new-password' : 'current-password'"
            required
          />
          <v-text-field
            v-if="isRegistration"
            v-model="confirmPassword"
            label="Повторите пароль"
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
            {{ isSubmitting ? 'Входим...' : title }}
          </v-btn>

          <v-btn
            v-if="isSlowResponse"
            class="mt-2"
            block
            variant="outlined"
            color="grey"
            @click="cancelLogin"
          >
            Отменить
          </v-btn>

          <v-btn
            v-if="showRetryButton && !isSubmitting"
            class="mt-2"
            block
            color="primary"
            @click="submit"
          >
            Повторить
          </v-btn>
          <v-btn
            v-if="!isRegistration"
            class="mt-3"
            block
            variant="text"
            type="button"
            @click="continueWithoutAccount"
          >
            Продолжить без аккаунта
          </v-btn>
        </v-form>

        <v-card-actions class="justify-center mt-3">
          <v-btn
            v-if="isRegistration && !isOfflineMode"
            variant="text"
            :to="{ name: 'login' }"
          >
            Уже есть аккаунт? Войти
          </v-btn>
          <template v-else-if="!isOfflineMode">
            <span class="auth-switch-label">Нет аккаунта?</span>
            <v-btn
              variant="text"
              class="auth-switch-link"
              color="primary"
              density="comfortable"
              :to="{ name: 'register' }"
            >
              Зарегистрироваться
            </v-btn>
          </template>
        </v-card-actions>
        </template>
      </v-card>
    </v-container>

    <v-dialog v-model="showTransferDialog" max-width="440" persistent>
      <v-card>
        <v-card-title>Перенести локальные расходы?</v-card-title>
        <v-card-text>
          Найдено расходов: {{ anonymousExpensesCount }}. Перенести их в ваш аккаунт?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="skipTransfer">Оставить локально</v-btn>
          <v-btn color="primary" :loading="isSubmitting" @click="transferAnonymousExpenses">
            Перенести
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
