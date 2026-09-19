import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

const updateAvailable = ref(false)

let initialized = false
let hasController = !!navigator.serviceWorker.controller

export function initializePwaUpdate() {
  if (initialized || !('serviceWorker' in navigator)) {
    return
  }

  initialized = true

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasController) {
      updateAvailable.value = true
    }

    hasController = true
  })

  registerSW({
    immediate: true
  })
}

export function updatePwa() {
  window.location.reload()
}

export { updateAvailable }