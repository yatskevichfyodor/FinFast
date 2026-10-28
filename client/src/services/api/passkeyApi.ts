import { authClient } from "@/services/api/http";
import {
  browserSupportsWebAuthn,
  sendSignal,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

type RegistrationOptions = PublicKeyCredentialCreationOptionsJSON & { challengeId: string };
type LoginOptions = PublicKeyCredentialRequestOptionsJSON & { challengeId: string };

function assertSupported() {
  if (!browserSupportsWebAuthn()) {
    throw new Error("Passkey не поддерживается этим браузером");
  }
}

async function registrationClientSteps(
  username: string,
  displayName: string,
  statelessPurpose: "register" | "link",
) {
  assertSupported();
  const { data: options } = await authClient.get<RegistrationOptions>(
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
  const credential = await startRegistration({
    optionsJSON: { ...publicKeyOptions, challenge },
  });

  return {
    id: credential.id,
    rawId: credential.rawId,
    response: {
      attestationObject: credential.response.attestationObject,
      clientDataJSON: credential.response.clientDataJSON,
    },
    type: credential.type,
    challengeId,
    challenge,
  };
}

async function loginClientSteps(username?: string) {
  assertSupported();
  const { data: options } = await authClient.get<LoginOptions>(
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

  let credential: Awaited<ReturnType<typeof startAuthentication>>;
  try {
    credential = await startAuthentication({
      optionsJSON: { ...publicKeyOptions, challenge },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw new Error("Аутентификация с помощью ключа доступа была отменена. Попробуйте заново либо проверьте настройки менеджера паролей.");
    }
    throw new Error("Не удалось подтвердить passkey. Проверьте настройки менеджера паролей.");
  }
  
  return {
    id: credential.id,
    rawId: credential.rawId,
    response: {
      clientDataJSON: credential.response.clientDataJSON,
      authenticatorData: credential.response.authenticatorData,
      signature: credential.response.signature,
      userHandle: credential.response.userHandle ?? "",
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

    await Promise.all(data.credentialIds.map(async (credentialId) => {
      try {
        await sendSignal({
          signalName: "unknownCredential",
          rpID: data.rpId,
          credentialID: credentialId,
        });
      } catch {
        // The signal is best-effort; server-side unlink has already succeeded.
      }
    }))
  },
};
