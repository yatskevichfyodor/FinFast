<script setup lang="ts">
import CurrencySymbol from "@/components/CurrencySymbol.vue";
import type { CurrencyCode } from "@/types/currency";

defineProps<{
  amount: number;
  currency: CurrencyCode;
  symbolSize?: number;
}>();
</script>

<template>
  <span class="currency-amount">
    <span>{{ amount.toFixed(2) }}</span>
    <CurrencySymbol :currency="currency" :size="symbolSize" />
  </span>
</template>

<style scoped>
.currency-amount {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>
