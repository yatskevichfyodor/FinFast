<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useExpenseStore } from '@/stores/expense'
import { loadExpenses as loadStoredExpenses, saveExpenses } from '@/services/expenseStorage'
import { validateJson, mergeExpenses, type ImportFileData } from '@/services/expenseImport'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const authStore = useAuthStore()
const expenseStore = useExpenseStore()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function cancel() {
  resetMessages()
  emit('update:modelValue', false)
}

function resetMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function triggerFileSelect() {
  resetMessages()
  fileInput.value?.click()
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Проверка расширения файла
  if (!file.name.endsWith('.json')) {
    errorMessage.value = 'Можно импортировать только JSON-файлы.'
    return
  }

  try {
    isLoading.value = true
    resetMessages()

    const fileContent = await readFile(file)
    const validation = validateJson(fileContent)

    if (validation.error) {
      errorMessage.value = validation.error
      return
    }

    const importedData = validation.data as ImportFileData
    const userId = authStore.userId || 'anonymous'

    // Загружаем существующие расходы
    const existingExpenses = await loadStoredExpenses(userId)

    // Объединяем данные
    const { merged, added, updated } = mergeExpenses(existingExpenses, importedData.expenses)

    // Сохраняем объединённые данные
    await saveExpenses(userId, merged)

    // Обновляем store
    await expenseStore.refreshExpenses()

    // Показываем успешное сообщение
    if (added === 0 && updated === 0) {
      successMessage.value = 'Импорт завершён. Нет новых данных.'
    } else if (updated === 0) {
      successMessage.value = `Импорт успешен! Добавлено ${added} ${pluralExpense(added)}.`
    } else if (added === 0) {
      successMessage.value = `Импорт успешен! Обновлено ${updated} ${pluralExpense(updated)}.`
    } else {
      successMessage.value = `Импорт успешен! Добавлено ${added}, обновлено ${updated} ${pluralExpense(added + updated)}.`
    }

    // Закрываем диалог через 2 секунды
    setTimeout(() => {
      emit('update:modelValue', false)
    }, 2000)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка при импорте'
    errorMessage.value = `Ошибка: ${errorMsg}`
  } finally {
    isLoading.value = false
    // Сбросим input, чтобы можно было выбрать тот же файл снова
    target.value = ''
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content === 'string') {
        resolve(content)
      } else {
        reject(new Error('Не удалось прочитать файл'))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsText(file)
  })
}

function pluralExpense(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'расхода'
  }
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'расходов'
  }
  return 'расходов'
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card rounded="xl" class="import-card">
      <div class="import-header">
        <div class="import-icon">
          <v-icon icon="mdi-file-upload-outline" size="25" />
        </div>

        <div>
          <div class="text-h6 font-weight-bold">Импорт расходов</div>
          <div class="text-body-2 import-header-subtitle">Загрузите сохранённые данные</div>
        </div>
      </div>

      <v-card-text class="px-5">
        <!-- Успешное сообщение -->
        <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable>
          {{ successMessage }}
        </v-alert>

        <!-- Сообщение об ошибке -->
        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable>
          {{ errorMessage }}
        </v-alert>

        <!-- Содержимое при отсутствии ошибок -->
        <div v-if="!successMessage && !errorMessage" class="text-center">
          <div class="text-body-2 text-medium-emphasis mb-4 import-description">
            Выберите файл для загрузки расходов
          </div>

          <div class="py-4">
            <v-icon icon="mdi-cloud-upload" size="64" color="medium-emphasis" class="mb-3" />
          </div>

          <p class="text-caption text-medium-emphasis">
            Поддерживаются файлы, экспортированные из приложения в JSON формате
          </p>
        </div>
      </v-card-text>

      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="isLoading" @click="cancel">
          {{ successMessage ? 'Закрыть' : 'Отмена' }}
        </v-btn>
        <v-btn
          class="import-submit-button"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-upload"
          :disabled="isLoading || !!successMessage"
          :loading="isLoading"
          @click="triggerFileSelect"
        >
          {{ isLoading ? 'Загрузка...' : 'Выбрать файл' }}
        </v-btn>
      </v-card-actions>

      <!-- Скрытый input для выбора файла -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileSelected"
      />
    </v-card>
  </v-dialog>
</template>

<style scoped>
.import-card {
  overflow: hidden;
  border: 1px solid rgba(38, 50, 56, 0.08);
  box-shadow: 0 18px 45px rgba(38, 50, 56, 0.18) !important;
}

.import-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px;
  color: #ffffff;
  background: linear-gradient(135deg, #4a7ba7 0%, #5fa9b8 100%);
}

.import-icon {
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

.import-header-subtitle {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.78);
}

.import-description,
.v-card-text .text-body-2 {
  line-height: 1.35;
}

.import-description {
  padding-left: 24px;
}

.import-submit-button {
  color: #ffffff;
  background: linear-gradient(135deg, #4a7ba7 0%, #5fa9b8 100%);
  box-shadow: none;
  transition: filter 0.2s ease;
}

.import-submit-button:hover {
  filter: brightness(0.92);
}
</style>



