<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function addDigit(digit: string) {
  let value = arguments[0]

  if (value === '0' && digit !== '.') {
    value = ''
  }

  emit('update:modelValue', value + digit)
}

function removeLast() {
  emit(
    'update:modelValue',
    arguments[0] === undefined ? '' : ''
  )
}
</script>

<template>
  <div class="amount-input">
    <div class="amount">
      <span class="amount-value">
        {{ modelValue || '0' }}
      </span>
      <span class="currency">₾</span>
    </div>

    <div class="keypad">
      <button @click="addDigit('1')">1</button>
      <button @click="addDigit('2')">2</button>
      <button @click="addDigit('3')">3</button>

      <button @click="addDigit('4')">4</button>
      <button @click="addDigit('5')">5</button>
      <button @click="addDigit('6')">6</button>

      <button @click="addDigit('7')">7</button>
      <button @click="addDigit('8')">8</button>
      <button @click="addDigit('9')">9</button>

      <button @click="addDigit('.')">.</button>
      <button @click="addDigit('0')">0</button>
      <button @click="removeLast()">⌫</button>
    </div>
  </div>
</template>