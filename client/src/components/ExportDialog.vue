<script setup lang="ts">
import { ref, watch } from 'vue'

import { createCsvExport, createJsonExport, downloadExport, type ExportFormat } from '@/services/expenseExport'
import { loadExpenses } from '@/services/expenseStorage'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const authStore = useAuthStore()
const localOpen = ref(props.modelValue)
const isExporting = ref(false)
const exportError = ref(false)
watch(() => props.modelValue, v => (localOpen.value = v))
watch(localOpen, v => emit('update:modelValue', v))

const selectedFormat = ref<ExportFormat>('json')

function cancel() {
  localOpen.value = false
}

async function doExport() {
  if (!authStore.userId || isExporting.value) {
    return
  }

  isExporting.value = true
  exportError.value = false

  try {
    const expenses = await loadExpenses(authStore.userId)
    const content = selectedFormat.value === 'json'
      ? createJsonExport(expenses)
      : createCsvExport(expenses)

    downloadExport(content, selectedFormat.value)
    localOpen.value = false
  } catch {
    exportError.value = true
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <v-dialog v-model="localOpen" max-width="480">
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center text-h6 font-weight-bold pt-5 px-5">
        <v-icon icon="mdi-download" class="mr-3" />
        Экспорт данных
      </v-card-title>

      <v-card-text class="px-5">
        <div class="text-body-2 text-medium-emphasis mb-4">
          Выберите формат экспорта. Файл будет загружен на ваше устройство.
        </div>

        <v-radio-group v-model="selectedFormat" hide-details>
          <v-radio value="json">
            <template #label>
              <div>
                <div class="font-weight-medium">JSON</div>
                <div class="text-body-2 text-medium-emphasis">Резервная копия и перенос между приложениями</div>
              </div>
            </template>
          </v-radio>

          <v-radio value="csv">
            <template #label>
              <div>
                <div class="font-weight-medium">Excel (CSV)</div>
                <div class="text-body-2 text-medium-emphasis">Открыть и редактировать в таблицах</div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>

        <div v-if="exportError" class="text-body-2 text-error mt-3">
          Не удалось экспортировать расходы. Попробуйте ещё раз.
        </div>
      </v-card-text>

      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="isExporting" @click="cancel">Отмена</v-btn>
        <v-btn color="primary" variant="flat" :loading="isExporting" :disabled="isExporting" @click="doExport">
          Скачать
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.v-card-title .v-icon {
  font-size: 22px;
  color: var(--v-primary-base);
}

.v-radio .font-weight-medium {
  font-size: 15px;
}

.v-card-text .text-body-2 {
  line-height: 1.35;
}
</style>

