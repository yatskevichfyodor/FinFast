<script setup lang="ts">
import { ref, watch } from "vue";
import { useDropZone } from "@vueuse/core";
import { useAuthStore } from "@/stores/authStore";
import { expenseStorage } from "@/storage/indexedDB";
import {
  validateJson,
  mergeExpenses,
  type ImportFileData,
} from "@/services/expenseImport";
import { useExpenseStore } from "@/stores";
import { useI18n } from "vue-i18n";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

// Сбрасываем сообщения при открытии диалога
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      resetMessages();
    }
  },
);

const authStore = useAuthStore();
const { t } = useI18n();
const expenseStore = useExpenseStore().value!;

const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const dropZoneRef = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

async function handleDrop(files: File[] | null) {
  if (!files || files.length === 0) return;
  if (isLoading.value) return;

  const file = files[0];
  if (!file) return;

  // Сбрасываем сообщения перед обработкой
  resetMessages();

  await processFile(file);
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
});

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = true;
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = true;
}

function handleNativeDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const fileArray = Array.from(files);
    handleDrop(fileArray);
  }
}

function cancel() {
  resetMessages();
  emit("update:modelValue", false);
}

function resetMessages() {
  errorMessage.value = null;
  successMessage.value = null;
}

function triggerFileSelect() {
  resetMessages();
  fileInput.value?.click();
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  await processFile(file);

  // Сбросим input, чтобы можно было выбрать тот же файл снова
  target.value = "";
}

async function processFile(file: File) {
  // Проверка расширения файла
  if (!file.name.endsWith(".json")) {
    if (file.name.endsWith(".csv")) {
      errorMessage.value =
        t("import.csvError");
    } else {
      errorMessage.value =
        t("import.fileError");
    }
    return;
  }

  try {
    isLoading.value = true;
    resetMessages();

    const fileContent = await readFile(file);
    const validation = validateJson(fileContent);

    if (validation.error) {
      errorMessage.value = validation.error;
      return;
    }

    const importedData = validation.data as ImportFileData;
    const userId = authStore.userId || "anonymous";

    // Загружаем существующие расходы
    const existingExpenses = await expenseStorage.loadExpenses(userId);

    // Объединяем данные
    const { merged, added, updated } = mergeExpenses(
      existingExpenses,
      importedData.expenses,
    );

    // Сохраняем объединённые данные
    await expenseStorage.saveExpenses(userId, merged);

    await expenseStore.loadDataFromStorage();

    // Показываем успешное сообщение
    if (added === 0 && updated === 0) {
      successMessage.value = t("import.noChanges");
    } else if (updated === 0) {
      successMessage.value = t("import.added", { count: added });
    } else if (added === 0) {
      successMessage.value = t("import.updated", { count: updated });
    } else {
      successMessage.value = t("import.summary", { added, updated });
    }

    // Закрываем диалог через 2 секунды
    setTimeout(() => {
      emit("update:modelValue", false);
    }, 2000);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : t("import.unknownError");
    errorMessage.value = `${t("common.error")}: ${errorMsg}`;
  } finally {
    isLoading.value = false;
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        resolve(content);
      } else {
        reject(new Error(t("import.readError")));
      }
    };
    reader.onerror = () => reject(new Error(t("import.readFailure")));
    reader.readAsText(file);
  });
}

</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card
      rounded="xl"
      class="import-card"
      @dragover.prevent
      @dragenter.prevent
      @dragleave.prevent
      @drop.prevent
    >
      <div class="import-header">
        <div class="import-icon">
          <v-icon icon="mdi-file-upload-outline" size="25" />
        </div>

        <div>
          <div class="text-h6 font-weight-bold">{{ t("import.title") }}</div>
          <div class="text-body-2 import-header-subtitle">
            {{ t("import.subtitle") }}
          </div>
        </div>
      </div>

      <v-card-text class="px-5">
        <!-- Успешное сообщение -->
        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ successMessage }}
        </v-alert>

        <!-- Сообщение об ошибке -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="resetMessages"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Содержимое при отсутствии ошибок -->
        <div v-if="!successMessage && !errorMessage" class="text-center">
          <div class="text-body-2 text-medium-emphasis mb-4 import-description">
            {{ t("import.description") }}
          </div>

          <div
            ref="dropZoneRef"
            class="drop-zone py-8"
            :class="{
              'drop-zone-active': (isOverDropZone || isDragging) && !isLoading,
              'drop-zone-loading': isLoading,
            }"
            @click="triggerFileSelect"
            @dragover="handleDragOver"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @drop="handleNativeDrop"
          >
            <v-icon
              :icon="
                isLoading
                  ? 'mdi-loading'
                  : isOverDropZone
                    ? 'mdi-cloud-download'
                    : 'mdi-cloud-upload'
              "
              size="64"
              :color="
                isLoading
                  ? 'primary'
                  : isOverDropZone
                    ? 'primary'
                    : 'medium-emphasis'
              "
              class="mb-3"
              :class="{ 'spin-animation': isLoading }"
            />
            <p
              class="text-body-2"
              :class="isOverDropZone ? 'text-primary' : 'text-medium-emphasis'"
            >
              {{
                isLoading
                  ? t("import.loading")
                  : isOverDropZone
                    ? t("import.drop")
                    : t("import.select")
              }}
            </p>
          </div>

          <p class="text-caption text-medium-emphasis mt-3">
            {{ t("import.supported") }}
          </p>
        </div>
      </v-card-text>

      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn
          class="cancel-button"
          variant="flat"
          rounded="lg"
          :disabled="isLoading"
          @click="cancel"
        >
          {{ successMessage ? t("common.close") : t("common.cancel") }}
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

.drop-zone {
  border: 2px dashed rgba(165, 214, 167, 0.4);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.drop-zone-active {
  border-color: #4a7ba7;
  background: rgba(74, 123, 167, 0.08);
  transform: scale(1.02);
}

.drop-zone-loading {
  pointer-events: none;
  opacity: 0.7;
}

.spin-animation {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.cancel-button {
  color: #4a7ba7;
  background: rgba(74, 123, 167, 0.08);
  box-shadow: none;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: rgba(74, 123, 167, 0.15);
  transform: translateY(-1px);
}

.cancel-button:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
