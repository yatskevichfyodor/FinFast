import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/types/currency";

const STORAGE_KEY_PREFIX = "finfast-currency-";

function readCurrency(userId: string | null): CurrencyCode {
  if (!userId) return DEFAULT_CURRENCY;
  const savedCurrency = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  return isCurrencyCode(savedCurrency) ? savedCurrency : DEFAULT_CURRENCY;
}

export const useCurrencyStore = defineStore("currency", () => {
  const authStore = useAuthStore();
  const currency = ref<CurrencyCode>(readCurrency(authStore.userId));

  watch(
    () => authStore.userId,
    (userId) => {
      currency.value = readCurrency(userId);
    },
  );

  function setCurrency(value: CurrencyCode) {
    if (!isCurrencyCode(value)) return;
    currency.value = value;
    if (authStore.userId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${authStore.userId}`, value);
    }
  }

  return { currency, setCurrency };
});
