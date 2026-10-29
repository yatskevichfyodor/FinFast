<script setup lang="ts">
import { ref, watch } from 'vue'

import { createCsvExport, createJsonExport, downloadExport, type ExportFormat } from '@/services/expenseExport'
import { expenseStorage } from '@/storage/indexedDB'
import { useAuthStore } from '@/stores/authStore'
import { useCategoryStore } from '@/stores'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const authStore = useAuthStore()
const { t } = useI18n()
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
    const categoryStore = useCategoryStore().value
    if (!categoryStore || categoryStore.userId !== authStore.userId) {
      throw new Error('Category data for the active account is not ready')
    }
    await categoryStore.loadDataFromStorage()
    const expenses = await expenseStorage.loadExpenses(authStore.userId)
    const content = selectedFormat.value === 'json'
      ? createJsonExport(expenses, categoryStore.customCategories)
      : createCsvExport(expenses, expense => {
        const categoryId = expense.customCategoryId ?? expense.categoryId
        return categoryStore.categories.find(category => category.id === categoryId)?.name
          ?? categoryStore.getCategoryDisplay(categoryId).name
      })

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
            <div class="text-h6 font-weight-bold">{{ t('export.title') }}</div>
              <div class="text-body-2 export-header-subtitle">{{ t('export.subtitle') }}</div>
        </div>
      </div>

      <v-card-text class="px-5">
        <div class="text-body-2 text-medium-emphasis mb-4 export-description">
          {{ t('export.choose') }}
        </div>

        <v-radio-group v-model="selectedFormat" hide-details class="format-group">
          <v-radio value="json" class="format-option format-option-json">
            <template #label>
              <div class="format-content">
                <div class="format-title">JSON</div>
                <div class="text-body-2 text-medium-emphasis">{{ t('export.backup') }}</div>
              </div>
            </template>
          </v-radio>

          <v-radio value="csv" class="format-option format-option-csv">
            <template #label>
              <div class="format-content">
                <div class="format-title">{{ t('export.csv') }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ t('export.excel') }}</div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>

        <div v-if="exportError" class="text-body-2 text-error mt-3">
          {{ t('export.error') }}
        </div>
      </v-card-text>

      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="isExporting" @click="cancel">{{ t('common.cancel') }}</v-btn>
        <v-btn variant="flat" rounded="lg" prepend-icon="mdi-download" class="export-submit-button" :loading="isExporting" :disabled="isExporting" @click="doExport">
          {{ t('export.download') }}
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
  background: linear-gradient(135deg, #4a7ba7 0%, #5fa9b8 100%);
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
  background: linear-gradient(135deg, #4a7ba7 0%, #5fa9b8 100%);
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
  border-color: #5fa9b8;
  background: #f0f7fa;
}

:deep(.format-option-json.v-selection-control--dirty) {
  border-color: #4a7ba7;
  background: #f2f8fc;
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




