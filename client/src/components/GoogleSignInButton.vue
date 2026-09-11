<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadGoogleIdentity } from '@/services/googleIdentity'

const emit = defineEmits<{
  (e: 'credential', credential: string): void
  (e: 'error', message: string): void
}>()

const container = ref<HTMLElement | null>(null)

onMounted(async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    emit('error', 'Вход через Google пока не настроен')
    return
  }

  try {
    const google = await loadGoogleIdentity()
    google.initialize({
      client_id: clientId,
      callback: response => {
        if (response.credential) {
          emit('credential', response.credential)
        } else {
          emit('error', 'Google не вернул данные для входа')
        }
      }
    })
    if (container.value) {
      const width = Math.min(container.value.clientWidth || 392, 392)
      google.renderButton(container.value, { theme: 'outline', size: 'large', text: 'continue_with', width })
    }
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Не удалось подключиться к Google')
  }
})
</script>

<template><div ref="container" class="google-sign-in-button" /></template>

<style scoped>
.google-sign-in-button { display: flex; width: 100%; min-width: 0; justify-content: center; min-height: 40px; }
</style>
