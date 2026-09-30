import { once } from "lodash-es";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

export const loadGoogleIdentity = once(async (): Promise<GoogleAccountsId> => {
  if (window.google?.accounts?.id) {
    return window.google.accounts.id;
  }

  const script = document.createElement("script");
  script.src = GOOGLE_IDENTITY_SCRIPT_URL;
  script.async = true;

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Не удалось загрузить Google Identity Services"));

    document.head.appendChild(script);
  });

  const identity = window.google?.accounts?.id;

  if (!identity) {
    throw new Error("Google Identity Services не загрузился");
  }

  return identity;
});
