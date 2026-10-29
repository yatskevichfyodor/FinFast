<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: boolean
  pendingExpensesCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
const { t, locale } = useI18n()

const pendingExpensesMessage = computed(() => {
  const count = props.pendingExpensesCount
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  if (locale.value === 'en') {
    return count === 1
      ? t('logout.messageEnOne')
      : t('logout.messageEnMany', { count })
  }

  const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? t('logout.expensesMany')
    : lastDigit === 1
      ? t('logout.expense')
      : lastDigit >= 2 && lastDigit <= 4
        ? t('logout.expensesFew')
        : t('logout.expensesMany')

  return t('logout.message', { count, word })
})

function stay() {
  emit('update:modelValue', false)
}

function logout() {
  emit('confirm')
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-text class="logout-message">
        <strong>{{ pendingExpensesMessage }}</strong>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="stay">
          {{ t('logout.stay') }}
        </v-btn>
        <v-btn color="primary" variant="flat" @click="logout">
          {{ t('menu.logout') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.logout-message {
  color: #263238;
  line-height: 1.5;
}
</style>
