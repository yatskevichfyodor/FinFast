import {
  AUTH_BASE_URL,
  authClient,
  dataChangesClient,
  expenseClient,
} from "@/services/api/http";
import tokenStorage from "@/storage/tokenStorage";
import type { AxiosInstance } from "axios";
import { useAuthStore } from "@/stores/authStore";
import { pinia } from "@/stores";
import axios from "axios";

const clients = [authClient, expenseClient, dataChangesClient];

const authStore = useAuthStore(pinia);

const PUBLIC_AUTH_REQUESTS = new Set([
  `/auth/login`,
  `/auth/register`,
  `/auth/refresh`,
  `/auth/google`,
  `/auth/passkey/register`,
  `/auth/passkey/login`,
  `/auth/passkey/register-options`,
  `/auth/passkey/login-options`,
  `/auth/passkey/register-options`,
  `/auth/passkey/login-options`,
  `/q/webauthn/register-options-challenge`,
  `/q/webauthn/login-options-challenge`,
]);

function isPublicAuthRequest(baseUrl: string, url: string): boolean {
  return baseUrl === AUTH_BASE_URL && PUBLIC_AUTH_REQUESTS.has(url);
}

function setupRequestInterceptor(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    if (isPublicAuthRequest(config.baseURL!, config.url ?? "")) {
      return config;
    }

    if (authStore.isOffline || authStore.isAnonymous) {
      return config;
    }

    let accessToken = authStore.accessToken;

    if (!accessToken) {
      return config;
    }

    // refresh expired token before request
    if (authStore.isAccessTokenExpired()) {
      await refreshTokens();
      accessToken = authStore.accessToken;
    }

    config.headers.Authorization = `Bearer ${accessToken}`;

    return config;
  });
}

function setupResponseInterceptor(client: AxiosInstance) {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const requestUrl = error.config?.url ?? "";
      const isRetry = error.config?._finfastRetry === true;

      if (
        error.response?.status !== 401 ||
        isPublicAuthRequest(error.config?.baseURL ?? "", requestUrl)
      ) {
        return Promise.reject(error);
      }

      if (authStore.isOffline || authStore.isAnonymous) {
        return Promise.reject(error);
      }

      if (isRetry) {
        authStore.markSessionIssue();
        return Promise.reject(error);
      }

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        authStore.markSessionIssue();
        return Promise.reject(error);
      }

      await refreshTokens();
      error.config._finfastRetry = true;
      error.config.headers.Authorization = `Bearer ${authStore.accessToken}`;

      return client.request(error.config); // request again with new access_token
    },
  );
}

async function refreshTokens() {
  try {
    await authStore.refresh();
  } catch (error) {
    console.log("Refresh tokens request error: ", error);
    if (
      !tokenStorage.getRefreshToken() ||
      (axios.isAxiosError(error) && error.response?.status === 401)
    ) {
      authStore.markSessionIssue();
    }
    throw error;
  }
}

clients.forEach((client) => {
  setupRequestInterceptor(client);
  setupResponseInterceptor(client);
});
console.log("API INTERCEPTORS INITIALIZED");
