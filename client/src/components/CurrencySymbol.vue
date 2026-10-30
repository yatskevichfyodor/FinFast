<script setup lang="ts">
import { getCurrencySymbol, type CurrencyCode } from "@/types/currency";

defineProps<{
  currency: CurrencyCode;
  size?: number;
}>();
</script>

<template>
  <img
    v-if="currency === 'BYN'"
    src="/byn-symbol.webp"
    alt="BYN"
    class="currency-image"
    :style="{ height: `${size ?? 14}px` }"
  />
  <span v-else>{{ getCurrencySymbol(currency) }}</span>
</template>

<style scoped>
.currency-image {
  display: inline-block;
  width: auto;
  vertical-align: middle;
  object-fit: contain;
}
</style>
