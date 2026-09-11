<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadGoogleIdentity } from '@/services/googleIdentity'

const props = defineProps<{
  text?: string
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
      google.renderButton(container.value, { theme: 'outline', size: 'large', text: 'signin_with', width })
    }
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Не удалось подключиться к Google')
  }
})

function handleCustomClick() {
  const googleButton = container.value?.querySelector('div[role="button"]')
  if (googleButton instanceof HTMLElement) {
    googleButton.click()
  }
}
</script>

<template>
  <div class="google-sign-in-button">
    <div ref="container" class="google-hidden-button" />
    <v-btn
      v-if="text"
      ref="customButton"
      variant="outlined"
      color="#4285f4"
      class="google-custom-btn"
      @click="handleCustomClick"
    >
      <v-icon start size="20">mdi-google</v-icon>
      {{ text }}
    </v-btn>
  </div>
</template>

<style scoped>
.google-sign-in-button {
  display: flex;
  width: 100%;
  min-width: 0;
  justify-content: center;
  min-height: 40px;
  position: relative;
}

.google-hidden-button {
  position: absolute;
  visibility: hidden;
  width: 0;
  height: 0;
  overflow: hidden;
}

.google-custom-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 8px;
  text-transform: none;
  letter-spacing: 0.3px;
  font-weight: 500;
}
</style>
