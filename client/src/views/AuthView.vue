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

const isRegistration = computed(() => route.name === 'register')
const title = computed(() => isRegistration.value ? 'Регистрация' : 'Вход')

async function checkAuthService() {
  if (isRegistration.value) {
    return
  }

  isCheckingService.value = true
  isServiceAvailable.value = await authApi.isAvailable()
  isCheckingService.value = false
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      return responseMessage
    }
  }

  return isRegistration.value
    ? 'Не удалось зарегистрироваться'
    : 'Неверный логин или пароль'
}

async function submit() {
  errorMessage.value = ''

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Заполните логин и пароль'
    return
  }

  if (isRegistration.value && password.value !== confirmPassword.value) {
    errorMessage.value = 'Пароли не совпадают'
    return
  }

  isSubmitting.value = true

  try {
    if (isRegistration.value) {
      await authStore.register(username.value, password.value)
      await router.push({ name: 'login', query: { registered: 'true' } })
    } else {
      await authStore.login(username.value, password.value)
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
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
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

onMounted(() => {
  void checkAuthService()
})
</script>

<template>
  <v-main class="auth-page">
    <v-container class="auth-container" max-width="440">
      <v-card class="pa-6" elevation="3">
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
            v-model="username"
            label="Логин"
            autocomplete="username"
            autofocus
            required
          />
          <v-text-field
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
            class="mt-2"
            color="primary"
            block
            type="submit"
            :loading="isSubmitting"
          >
            {{ title }}
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
            v-if="isRegistration"
            variant="text"
            :to="{ name: 'login' }"
          >
            Уже есть аккаунт? Войти
          </v-btn>
          <template v-else>
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
  background: #f6f8fb;
}

.auth-container {
  padding-top: 12vh;
}

.auth-switch-link {
  padding-inline: 6px;
  font-weight: 600;
  letter-spacing: 0;
}

.auth-switch-label {
  color: rgba(var(--v-theme-on-surface), 0.65);
}
</style>
