import { authClient } from "@/services/api/http";
import displayDebugMessage from "@/utils/displayDebugMessage";

interface PublicKeyOptions {
  challenge: string;
  timeout?: number;
  rp?: PublicKeyCredentialRpEntity;
  user?: { id: string; name: string; displayName: string };
  pubKeyCredParams?: PublicKeyCredentialParameters[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
  allowCredentials?: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
}

function decode(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function encode(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function assertSupported() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error("Passkey не поддерживается этим браузером");
  }
}

async function registrationClientSteps(
  username: string,
  displayName = username,
) {
  assertSupported();
  const { data: options } = await authClient.get<PublicKeyOptions>(
    "/q/webauthn/register-options-challenge",
    {
      params: { username, displayName },
      withCredentials: true,
    },
  );
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      rp: options.rp ?? { name: "FinFast", id: window.location.hostname },
      user: options.user
        ? { ...options.user, id: decode(options.user.id) }
        : (() => {
            throw new Error("Сервер не вернул данные пользователя");
          })(),
      pubKeyCredParams: options.pubKeyCredParams ?? [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      })),
    },
  })) as PublicKeyCredential | null;
  if (
    !credential ||
    !(credential.response instanceof AuthenticatorAttestationResponse)
  ) {
    throw new Error("Не удалось создать passkey");
  }

  return {
    id: credential.id,
    rawId: encode(credential.rawId),
    response: {
      attestationObject: encode(credential.response.attestationObject),
      clientDataJSON: encode(credential.response.clientDataJSON),
    },
    type: credential.type,
  };
}

async function loginClientSteps(username?: string) {
  assertSupported();
  const { data: options } = await authClient.get<PublicKeyOptions>(
    "/q/webauthn/login-options-challenge",
    {
      params: username ? { username } : undefined,
      withCredentials: true,
    },
  );

  displayDebugMessage('options', options)

  const credentialRequestOptions = {
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      })),
    },
  };

  displayDebugMessage(credentialRequestOptions)

  let credential
  try {
    credential = (await navigator.credentials.get(credentialRequestOptions)) as PublicKeyCredential | null;
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error("Аутентификация с помощью ключа доступа была отменена, отклонена или завершилась по истечении времени. Проверьте настройки менеджера паролей.");
    }
    throw new Error("Не удалось подтвердить passkey. Проверьте настройки менеджера паролей.");
  }
  
  if (
    !credential ||
    !(credential.response instanceof AuthenticatorAssertionResponse)
  ) {
    throw new Error("Не удалось подтвердить passkey.");
  }
  
  displayDebugMessage('credential', credential)

  return {
    id: credential.id,
    rawId: encode(credential.rawId),
    response: {
      clientDataJSON: encode(credential.response.clientDataJSON),
      authenticatorData: encode(credential.response.authenticatorData),
      signature: encode(credential.response.signature),
      userHandle: credential.response.userHandle
        ? encode(credential.response.userHandle)
        : "",
    },
    type: credential.type,
  };
}

function registrationForm(
  username: string,
  registration: Awaited<ReturnType<typeof registrationClientSteps>>,
) {
  return new URLSearchParams({
    username,
    webAuthnId: registration.id,
    webAuthnRawId: registration.rawId,
    webAuthnResponseAttestationObject: registration.response.attestationObject,
    webAuthnResponseClientDataJSON: registration.response.clientDataJSON,
    webAuthnType: registration.type,
  });
}

export const passkeyApi = {
  async registerUserWithPasskey(username: string, displayName = username) {
    const registration = await registrationClientSteps(username, displayName);
    const form = registrationForm(username, registration);
    const { data } = await authClient.post("/auth/passkey/register", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: true,
    });
    return data;
  },

  async registerPasskeyForCurrentUser(
    username: string,
    displayName = username,
  ) {
    const registration = await registrationClientSteps(username, displayName);
    const form = registrationForm(username, registration);
    await authClient.post("/auth/passkey/link", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: true,
    });
  },

  async loginWithPasskey(username?: string) {
    const login = await loginClientSteps(username);
    const form = new URLSearchParams({
      webAuthnId: login.id,
      webAuthnRawId: login.rawId,
      webAuthnResponseClientDataJSON: login.response.clientDataJSON,
      webAuthnResponseAuthenticatorData: login.response.authenticatorData,
      webAuthnResponseSignature: login.response.signature,
      webAuthnResponseUserHandle: login.response.userHandle,
      webAuthnType: login.type,
    });
    const { data } = await authClient.post("/auth/passkey/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: true,
    });
    return data;
  },
  
  async unlinkPasskey(): Promise<void> {
    await authClient.delete('/auth/passkey/unlink')
  },
};
