import { authClient } from "@/services/api/http";

interface PublicKeyOptions {
  challenge: string;
  challengeId?: string;
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
  displayName: string,
  statelessPurpose: "register" | "link",
) {
  assertSupported();
  const { data: options } = await authClient.get<PublicKeyOptions>(
    statelessPurpose === "link"
      ? "/auth/passkey/link/register-options"
      : "/auth/passkey/register-options",
    {
      params: { username, displayName },
      withCredentials: false,
    },
  );
  const { challengeId, challenge, ...publicKeyOptions } = options;
  if (!challengeId || !challenge) {
    throw new Error("Сервер не вернул данные challenge");
  }
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...publicKeyOptions,
      challenge: decode(challenge),
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
    challengeId,
    challenge,
  };
}

async function loginClientSteps(username?: string) {
  assertSupported();
  const { data: options } = await authClient.get<PublicKeyOptions>(
    "/auth/passkey/login-options",
    {
      params: username ? { username } : undefined,
      withCredentials: false,
    },
  );
  const { challengeId, challenge, ...publicKeyOptions } = options;
  if (!challengeId || !challenge) {
    throw new Error("Сервер не вернул данные challenge");
  }

  const credentialRequestOptions = {
    publicKey: {
      ...publicKeyOptions,
      challenge: decode(challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: decode(item.id),
      })),
    },
  };

  let credential
  try {
    credential = (await navigator.credentials.get(credentialRequestOptions)) as PublicKeyCredential | null;
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error("Аутентификация с помощью ключа доступа была отменена. Попробуйте заново либо проверьте настройки менеджера паролей.");
    }
    throw new Error("Не удалось подтвердить passkey. Проверьте настройки менеджера паролей.");
  }
  
  if (
    !credential ||
    !(credential.response instanceof AuthenticatorAssertionResponse)
  ) {
    throw new Error("Не удалось подтвердить passkey.");
  }

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
    challengeId,
    challenge,
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
    challengeId: registration.challengeId ?? "",
    challenge: registration.challenge ?? "",
  });
}

export const passkeyApi = {
  async registerUserWithPasskey(username: string, displayName = username) {
    const registration = await registrationClientSteps(username, displayName, "register");
    const form = registrationForm(username, registration);
    const { data } = await authClient.post("/auth/passkey/register", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: false,
    });
    return data;
  },

  async registerPasskeyForCurrentUser(
    username: string,
    displayName = username,
  ) {
    const registration = await registrationClientSteps(username, displayName, "link");
    const form = registrationForm(username, registration);
    await authClient.post("/auth/passkey/link", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: false,
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
      challengeId: login.challengeId ?? "",
      challenge: login.challenge ?? "",
      ...(username ? { username } : {}),
    });
    const { data } = await authClient.post("/auth/passkey/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: false,
    });
    return data;
  },
  
  async unlinkPasskey(): Promise<void> {
    const { data } = await authClient.delete<{
      rpId: string;
      credentialIds: string[];
    }>('/auth/passkey/unlink')

    const signalUnknownCredential = (
      window.PublicKeyCredential as typeof PublicKeyCredential & {
        signalUnknownCredential?: (options: {
          rpId: string;
          credentialId: string;
        }) => Promise<void>;
      } | undefined
    )?.signalUnknownCredential

    if (!signalUnknownCredential) {
      return
    }

    await Promise.all(data.credentialIds.map(async (credentialId) => {
      try {
        await signalUnknownCredential({ rpId: data.rpId, credentialId })
      } catch {
        // The signal is best-effort; server-side unlink has already succeeded.
      }
    }))
  },
};
