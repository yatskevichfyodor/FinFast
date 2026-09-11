<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadGoogleIdentity } from '@/services/googleIdentity'

const props = defineProps<{
  hint?: string
}>()

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
      google.renderButton(container.value, { theme: 'outline', size: 'large', text: 'signin_with', width, locale: 'ru' })
    }
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Не удалось подключиться к Google')
  }
})
</script>

<template>
  <div class="google-sign-in-button">
    <div ref="container" class="google-button-container" />
    <div v-if="props.hint" class="google-button-hint">
      <v-icon size="15">mdi-information-outline</v-icon>
      <span>{{ props.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.google-sign-in-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 6px;
  min-height: 40px;
}

.google-button-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-button-hint {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  color: #757575;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}

.google-button-hint .v-icon {
  flex-shrink: 0;
  color: #9e9e9e;
}
</style>
