import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

const updateAvailable = ref(false)
const isUpdating = ref(false)
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let initialized = false

export function initializePwaUpdate() {
  if (initialized || !('serviceWorker' in navigator)) {
    return
  }

  initialized = true
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable.value = true
    }
  })
}

export async function updatePwa() {
  if (!updateSW || isUpdating.value) {
    return
  }

  isUpdating.value = true

  try {
    await updateSW(true)
    updateAvailable.value = false
  } catch {
    isUpdating.value = false
  }
}

export { isUpdating, updateAvailable }