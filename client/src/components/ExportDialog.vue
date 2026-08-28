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
    <v-card rounded="xl" class="export-card">
      <div class="export-header">
        <div class="export-icon">
          <v-icon icon="mdi-file-download-outline" size="25" />
        </div>

        <div>
          <div class="text-h6 font-weight-bold">Экспорт расходов</div>
          <div class="text-body-2 export-header-subtitle">Сохраните данные на своё устройство</div>
        </div>
      </div>

      <v-card-text class="px-5">
        <div class="text-body-2 text-medium-emphasis mb-4 export-description">
          Выберите формат файла
        </div>

        <v-radio-group v-model="selectedFormat" hide-details class="format-group">
          <v-radio value="json" class="format-option format-option-json">
            <template #label>
              <div class="format-content">
                <div class="format-title">JSON</div>
                <div class="text-body-2 text-medium-emphasis">Для резервной копии и переноса данных</div>
              </div>
            </template>
          </v-radio>

          <v-radio value="csv" class="format-option format-option-csv">
            <template #label>
              <div class="format-content">
                <div class="format-title">Таблица CSV</div>
                <div class="text-body-2 text-medium-emphasis">Для просмотра и редактирования в Excel</div>
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
        <v-btn variant="flat" rounded="lg" prepend-icon="mdi-download" class="export-submit-button" :loading="isExporting" :disabled="isExporting" @click="doExport">
          Скачать файл
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.export-card {
  overflow: hidden;
  border: 1px solid rgba(38, 50, 56, 0.08);
  box-shadow: 0 18px 45px rgba(38, 50, 56, 0.18) !important;
}

.export-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px;
  color: #ffffff;
  background: linear-gradient(135deg, #245b78 0%, #347f8a 100%);
}

.export-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.export-header-subtitle {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.78);
}

.export-description,
.format-option .text-body-2 {
  line-height: 1.35;
}

.export-description {
  padding-left: 24px;
}

.export-submit-button {
  color: #ffffff;
  background: linear-gradient(135deg, #245b78 0%, #347f8a 100%);
  box-shadow: none;
  transition: filter 0.2s ease;
}

.export-submit-button:hover {
  filter: brightness(0.92);
}

.format-group {
  display: grid;
  gap: 10px;
}

:deep(.format-option) {
  min-height: 76px;
  margin: 0;
  padding: 12px 18px;
  border: 1px solid #e4e9ed;
  border-radius: 12px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

:deep(.format-option .v-selection-control__wrapper) {
  margin-right: 10px;
}

:deep(.format-option .v-label) {
  flex: 1;
  opacity: 1;
}

:deep(.format-option.v-selection-control--dirty) {
  border-color: #218c8d;
  background: #edf8f6;
}

:deep(.format-option-json.v-selection-control--dirty) {
  border-color: #176b87;
  background: #eef7fa;
}

.format-content {
  min-width: 0;
}

.format-title {
  color: #263238;
  font-size: 15px;
  font-weight: 700;
}

</style>

