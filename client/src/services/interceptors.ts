import {
  AUTH_BASE_URL,
  authClient,
  dataChangesClient,
  expenseClient,
} from "@/services/api/http";
import router from "@/router";
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
]);

function isPublicAuthRequest(baseUrl: string, url: string): boolean {
  return baseUrl === AUTH_BASE_URL && PUBLIC_AUTH_REQUESTS.has(url);
}

function redirectToLogin() {
  tokenStorage.clear();

  void router.replace({
    name: "login",
    query: {
      redirect: router.currentRoute.value.fullPath,
    },
  });
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
        isPublicAuthRequest(error.config.baseURL, requestUrl) ||
        isRetry
      ) {
        return Promise.reject(error);
      }

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        redirectToLogin();
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
    // if user sent invalid refresh token, then redirect to login
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      redirectToLogin();
    } else {
      throw error;
    }
  }
}

clients.forEach((client) => {
  setupRequestInterceptor(client);
  setupResponseInterceptor(client);
});
console.log("API INTERCEPTORS INITIALIZED");
