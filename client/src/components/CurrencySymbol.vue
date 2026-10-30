<script setup lang="ts">
import { getCurrencySymbol, type CurrencyCode } from "@/types/currency";

defineProps<{
  currency: CurrencyCode;
  size?: number;
}>();

const baseUrl = import.meta.env.BASE_URL;
</script>

<template>
  <span
    v-if="currency === 'BYN'"
    class="currency-image"
    role="img"
    aria-label="BYN"
    :style="{
      width: `${size ?? 14}px`,
      height: `${size ?? 14}px`,
      maskImage: `url('${baseUrl}BYN_symbol.svg')`,
      WebkitMaskImage: `url('${baseUrl}BYN_symbol.svg')`,
    }"
  />
  <span v-else>{{ getCurrencySymbol(currency) }}</span>
</template>

<style scoped>
.currency-image {
  display: inline-block;
  vertical-align: middle;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-size: contain;
  -webkit-mask-size: contain;
}
</style>
