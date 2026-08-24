<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const isRegistration = computed(() => route.name === 'register')
const title = computed(() => isRegistration.value ? 'Регистрация' : 'Вход')

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
      await router.push({ name: 'home' })
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
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
        </v-form>

        <v-card-actions class="justify-center mt-3">
          <v-btn
            v-if="isRegistration"
            variant="text"
            :to="{ name: 'login' }"
          >
            Уже есть аккаунт? Войти
          </v-btn>
          <v-btn
            v-else
            variant="text"
            :to="{ name: 'register' }"
          >
            Нет аккаунта? Зарегистрироваться
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-container>
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
</style>
