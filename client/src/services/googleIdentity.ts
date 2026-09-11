const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

interface GoogleAccountsId {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

let loadingScript: Promise<GoogleAccountsId> | null = null

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id)
  }

  if (!loadingScript) {
    loadingScript = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GOOGLE_IDENTITY_SCRIPT_URL
      script.async = true
      script.onload = () => {
        const identity = window.google?.accounts?.id
        identity ? resolve(identity) : reject(new Error('Google Identity Services не загрузился'))
      }
      script.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  return loadingScript
}
