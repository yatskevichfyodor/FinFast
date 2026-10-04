<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import type { Category, CategoryInput } from "@/types/category";
import { useCategoryStore } from "@/stores";
import mdiIcons from "@iconify-json/mdi/icons.json";
import simpleIcons from "@iconify-json/simple-icons/icons.json";
import { refDebounced } from "@vueuse/core";
import { categoryApi } from "@/services/api/categoryApi";
import { toVuetifyCategoryIcon } from "@/utils/categoryIcon";

interface IconifyIconsJson {
  icons: Record<string, unknown>;
}

const store = useCategoryStore().value!;
const dialog = ref(false);
const editingId = ref<string | null>(null);
const form = ref<CategoryInput>({
  name: "",
  icon: "mdi-tag-outline",
  color: "#607D8B",
});
const popularIconOptions = [
  // other
  "mdi:dots-horizontal-circle",
  "mdi:tag-outline",
  "mdi:tag",
  "mdi:label",

  // clothes
  "mdi:tshirt-crew",

  // food
  "mdi:food",
  "mdi:food-apple",
  "mdi:food-drumstick",
  "mdi:silverware-fork-knife",
  "mdi:coffee",
  "mdi:cake",

  // shopping
  "mdi:cart",
  "mdi:basket",
  "mdi:shopping",
  "mdi:gift",

  // transport
  "mdi:car",
  "mdi:bus",
  "mdi:train",
  "mdi:bike",
  "mdi:scooter",
  "mdi:airplane",
  "mdi:taxi",
  "mdi:fuel",
  "mdi:walk",

  // health
  "mdi:run",
  "mdi:heart",
  "mdi:heart-pulse",
  "mdi:hospital-box",
  "mdi:pill",

  // home
  "mdi:home",
  "mdi:office-building",
  "mdi:city",
  "mdi:sofa",
  "mdi:bed",

  // stationery
  "mdi:notebook-outline",
  "mdi:notebook-edit-outline",
  "mdi:paperclip",
  "mdi:file-document-outline",
  "mdi:file-outline",

  // renovation and building
  "mdi:lightbulb",
  "mdi:water",
  "mdi:faucet",
  "mdi:tools",
  "mdi:hammer",
  "mdi:wrench",
  "mdi:hammer-wrench",
  "mdi:toolbox",
  "mdi:format-paint",
  "mdi:spray",
  "mdi:truck",

  // finances
  "mdi:cash",
  "mdi:credit-card",
  "mdi:bank",
  "mdi:bitcoin",
  "mdi:chart-line",

  // entartainment
  "mdi:gamepad-variant",
  "mdi:dice-multiple",
  "mdi:music",
  "mdi:movie",
  "mdi:theater",

  "mdi:school",
  "mdi:calculator",
  "mdi:laptop",
  "mdi:cellphone",
  "mdi:monitor",
  "mdi:printer",
  "mdi:camera",
  "mdi:image",
  "mdi:guitar-acoustic",
  "mdi:microphone",
  "mdi:dumbbell",
  "mdi:paw",
  "mdi:dog",
  "mdi:cat",
  "mdi:baby-face-outline",
  "mdi:flower",
  "mdi:tree",
  "mdi:leaf",
  "mdi:earth",
  "mdi:weather-sunny",
  "mdi:weather-cloudy",
  "mdi:beach",
  "mdi:map-marker",
  "mdi:calendar",
  "mdi:clock-outline",
  "mdi:bell",
  "mdi:lock",
  "mdi:key",
  "mdi:shield-check",
  "mdi:alert-circle",
  "mdi:youtube",
  "mdi:whatsapp",
  "mdi:github",
  "simple-icons:discord",
  "simple-icons:steam",
  "simple-icons:telegram",
  "mdi:account-group",
  "mdi:account",
  "mdi:star",
];
const simpleIconOptions = Object.keys(
  (simpleIcons as IconifyIconsJson).icons,
).map((name) => `simple-icons:${name}`);

const mdiIconOptions = Object.keys((mdiIcons as IconifyIconsJson).icons).map(
  (name) => `mdi:${name}`,
);

const allIconOptions: string[] = [
  ...popularIconOptions,
  ...simpleIconOptions.filter((icon) => !popularIconOptions.includes(icon)),
  ...mdiIconOptions.filter((icon) => !popularIconOptions.includes(icon)),
];
const colorOptions = [
  // red
  "#EF5350",
  "#E53935",

  // orange
  "#FF7043",
  "#FB8C00",

  // yellow
  "#FFCA28",
  "#FDD835",

  // green
  "#66BB6A",
  "#43A047",

  // teal
  "#26A69A",
  "#00897B",

  // cyan
  "#26C6DA",
  "#00ACC1",

  // blue
  "#42A5F5",
  "#1E88E5",

  // indigo
  "#5C6BC0",
  "#3949AB",

  // purple
  "#AB47BC",
  "#8E24AA",

  // pink
  "#EC407A",
  "#D81B60",

  // brown
  "#8D6E63",
  "#6D4C41",

  // gray
  "#78909C",
  "#546E7A",
];
const systemCategories = computed(() =>
  store.categories.filter((category) => category.system),
);
const customCategories = computed(() =>
  store.categories.filter((category) => !category.system),
);
const iconScroll = ref<HTMLElement | null>(null);
const canScrollUp = ref(false);
const canScrollDown = ref(true);
const iconSearch = ref("");
const debouncedIconSearch = refDebounced(iconSearch, 200);
const deleteWarning = ref<{
  category: Category;
  linkedExpensesCount: number;
} | null>(null);
const showDeleteWarning = computed({
  get: () => !!deleteWarning.value,
  set: (value: boolean) => {
    if (!value) deleteWarning.value = null;
  },
});
const visibleIconOptions = computed(() => {
  const query = debouncedIconSearch.value.trim().toLowerCase();

  if (!query) {
    return popularIconOptions;
  }

  return allIconOptions
    .filter((icon) => icon.replace("mdi:", "").toLowerCase().includes(query))
    .slice(0, 100);
});

function updateIconScrollState() {
  const element = iconScroll.value;
  if (!element) return;
  canScrollUp.value = element.scrollTop > 2;
  canScrollDown.value =
    element.scrollTop + element.clientHeight < element.scrollHeight - 2;
}

function scrollIcons(direction: "up" | "down") {
  iconScroll.value?.scrollBy({
    top: direction === "down" ? 180 : -180,
    behavior: "smooth",
  });
}

watch(dialog, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    updateIconScrollState();
  }
});

onMounted(() => window.addEventListener("resize", updateIconScrollState));
onUnmounted(() => window.removeEventListener("resize", updateIconScrollState));

function openCreate() {
  editingId.value = null;
  form.value = { name: "", icon: "mdi-tag-outline", color: "#607D8B" };
  dialog.value = true;
}

function openEdit(category: Category) {
  editingId.value = category.id;
  form.value = {
    name: category.name,
    icon: category.icon,
    color: category.color,
  };
  dialog.value = true;
}

async function save() {
  if (!form.value.name.trim()) return;
  if (editingId.value)
    await store.updateCustomCategory(editingId.value, form.value);
  else await store.createCustomCategory(form.value);
  dialog.value = false;
}

async function handleDeleteCategory(category: Category) {
  try {
    const linkedExpensesCount = await categoryApi.getNumberOfLinkedExpenses(
      category.id,
    );

    if (linkedExpensesCount > 0) {
      deleteWarning.value = {
        category,
        linkedExpensesCount,
      };
      return;
    }

    await store.removeCustomCategory(category.id);
  } catch (error) {
    console.error("Failed to check linked expenses before delete:", error);
    await store.removeCustomCategory(category.id);
  }
}

async function confirmDeleteCategory(mode: "hide" | "delete") {
  if (!deleteWarning.value) return;

  const { category } = deleteWarning.value;
  deleteWarning.value = null;

  if (mode === "hide") {
    await store.hideCustomCategory(category.id);
    return;
  }

  await store.removeCustomCategory(category.id);
}
</script>

<template>
  <v-main class="app-background category-editor">
    <div class="category-editor__content">
      <div class="category-editor__header mb-6">
        <div class="category-editor__title">
          <div class="text-h5 font-weight-bold">Категории</div>
          <div class="text-body-2 text-medium-emphasis">
            Ваши категории и доступные системные категории
          </div>
        </div>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="category-editor__add-button"
          @click="openCreate"
        >
          Добавить
        </v-btn>
      </div>

      <section class="mb-8">
        <div class="text-subtitle-1 font-weight-bold mb-3">Системные</div>
        <v-list rounded="lg" bg-color="transparent">
          <v-list-item v-for="category in systemCategories" :key="category.id">
            <template #prepend
              ><v-icon :color="category.color">{{
                category.icon
              }}</v-icon></template
            >
            <v-list-item-title>{{ category.name }}</v-list-item-title>
            <template #append>
              <v-btn
                v-if="category.hidden"
                icon="mdi-eye"
                variant="text"
                title="Восстановить"
                @click="store.restoreSystemCategory(category.id)"
              />
              <v-btn
                v-else
                icon="mdi-eye-off-outline"
                variant="text"
                title="Скрыть"
                @click="store.hideSystemCategory(category.id)"
              />
            </template>
          </v-list-item>
        </v-list>
      </section>

      <section>
        <div class="text-subtitle-1 font-weight-bold mb-3">Мои категории</div>
        <v-list
          v-if="customCategories.length"
          rounded="lg"
          bg-color="transparent"
        >
          <v-list-item
            v-for="category in customCategories"
            :key="category.id"
            :class="{ 'text-medium-emphasis': category.deleted }"
          >
            <template #prepend
              ><v-icon :color="category.color">{{
                toVuetifyCategoryIcon(category.icon)
              }}</v-icon></template
            >
            <v-list-item-title>{{ category.name }}</v-list-item-title>
            <template #append>
              <v-btn
                v-if="category.deleted"
                icon="mdi-restore"
                variant="text"
                title="Восстановить"
                @click="store.restoreCustomCategory(category.id)"
              />
              <template v-else>
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  title="Изменить"
                  @click="openEdit(category)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  title="Удалить"
                  @click="handleDeleteCategory(category)"
                />
              </template>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="text-body-2 text-medium-emphasis">
          Пользовательских категорий пока нет.
        </div>
      </section>
    </div>

    <v-dialog v-model="showDeleteWarning" max-width="460">
      <v-card v-if="deleteWarning">
        <v-card-title class="mx-auto">Удаление категории</v-card-title>
        <v-card-text>
          <div class="text-body-1 mb-2">
            У категории <strong>{{ deleteWarning.category.name }}</strong> есть
            {{ deleteWarning.linkedExpensesCount }} связанных расходов.
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Вы можете скрыть категорию, не затрагивая существующие платежи, или
            удалить её — тогда категория будет сброшена у связанных расходов.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteWarning = null">Отмена</v-btn>
          <v-btn color="primary" @click="confirmDeleteCategory('hide')">
            Скрыть
          </v-btn>
          <v-btn color="error" @click="confirmDeleteCategory('delete')">
            Удалить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>{{
          editingId ? "Изменить категорию" : "Новая категория"
        }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Название" autofocus />
          <div class="text-caption mb-2">Иконка</div>
          <div class="icon-picker mb-5">
            <v-text-field
              v-model="iconSearch"
              label="Поиск иконки"
              placeholder="Например, car, food, hammer..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-3"
            />
            <button
              v-if="canScrollUp"
              class="icon-scroll-indicator icon-scroll-indicator--top"
              type="button"
              aria-label="Прокрутить иконки вверх"
              @click="scrollIcons('up')"
            >
              <v-icon icon="mdi-chevron-up" size="18" />
            </button>
            <div
              ref="iconScroll"
              class="icon-scroll"
              @scroll="updateIconScrollState"
            >
              <div class="option-grid">
                <v-btn
                  v-for="icon in visibleIconOptions"
                  :key="icon"
                  icon
                  variant="text"
                  :class="{ selected: form.icon === icon }"
                  @click="form.icon = icon"
                >
                  <Icon
                    :icon="icon"
                    :color="form.color"
                    width="24"
                    height="24"
                  />
                </v-btn>
              </div>
            </div>
            <button
              v-if="canScrollDown"
              class="icon-scroll-indicator icon-scroll-indicator--bottom"
              type="button"
              aria-label="Прокрутить иконки вниз"
              @click="scrollIcons('down')"
            >
              <v-icon icon="mdi-chevron-down" size="18" />
            </button>
          </div>
          <div class="text-caption mb-2">Цвет</div>
          <div class="option-grid">
            <button
              v-for="color in colorOptions"
              :key="color"
              class="color-option"
              :class="{ selected: form.color === color }"
              :style="{ backgroundColor: color }"
              @click="form.color = color"
            />
          </div>
        </v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn variant="text" @click="dialog = false"
            >Отмена</v-btn
          ><v-btn color="primary" @click="save"
            >Сохранить</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
  </v-main>
</template>

<style scoped>
.category-editor__content {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px 120px;
}
.category-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.category-editor__title {
  min-width: 0;
}

.category-editor__add-button {
  flex-shrink: 0;
}

@media (max-width: 520px) {
  .category-editor__header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .category-editor__add-button {
    align-self: stretch;
  }
}
.icon-picker {
  position: relative;
}
.icon-scroll {
  max-height: 224px;
  overflow-y: auto;
  padding: 6px 4px;
  scrollbar-width: thin;
}
.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.option-grid .selected {
  background: rgba(25, 118, 210, 0.12);
}
.icon-scroll-indicator {
  position: absolute;
  left: 50%;
  z-index: 1;
  width: 32px;
  height: 24px;
  transform: translateX(-50%);
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  color: #546e7a;
  box-shadow: 0 2px 8px rgba(38, 50, 56, 0.18);
  cursor: pointer;
}
.icon-scroll-indicator--top {
  top: 0;
}
.icon-scroll-indicator--bottom {
  bottom: 0;
}
.color-option {
  width: 30px;
  height: 30px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}
.color-option.selected {
  border-color: #263238;
  box-shadow: 0 0 0 2px white inset;
}
</style>
