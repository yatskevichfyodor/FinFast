<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  pendingExpensesCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const pendingExpensesMessage = computed(() => {
  const count = props.pendingExpensesCount
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? 'расходов'
    : lastDigit === 1
      ? 'расход'
      : lastDigit >= 2 && lastDigit <= 4
        ? 'расхода'
        : 'расходов'

  return `${count} ${word} не синхронизированы и останутся только на этом устройстве.`
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
          Остаться
        </v-btn>
        <v-btn color="primary" variant="flat" @click="logout">
          Выйти
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
