<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useCategoryStore } from '@/stores/category'
import type { Category, CategoryInput } from '@/types/category'

const store = useCategoryStore()
const dialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref<CategoryInput>({ name: '', icon: 'mdi-tag-outline', color: '#607D8B' })
const iconOptions = [
  'mdi-tag-outline', 'mdi-tag', 'mdi-label', 'mdi-tshirt-crew', 'mdi-food',
  'mdi-food-apple', 'mdi-food-drumstick', 'mdi-silverware-fork-knife', 'mdi-coffee', 'mdi-cake',
  'mdi-cart', 'mdi-basket', 'mdi-car', 'mdi-bus', 'mdi-train',
  'mdi-bike', 'mdi-scooter', 'mdi-airplane', 'mdi-taxi', 'mdi-fuel',
  'mdi-home', 'mdi-office-building', 'mdi-city', 'mdi-bed', 'mdi-sofa',
  'mdi-lightbulb', 'mdi-water', 'mdi-tools', 'mdi-hammer', 'mdi-wrench',
  'mdi-faucet', 'mdi-hammer-wrench', 'mdi-toolbox', 'mdi-ladder',
  'mdi-format-paint', 'mdi-spray', 'mdi-truck',
  'mdi-shopping', 'mdi-gift', 'mdi-cash', 'mdi-credit-card', 'mdi-bank',
  'mdi-bitcoin', 'mdi-chart-line', 'mdi-briefcase', 'mdi-school',
  'mdi-school-outline', 'mdi-calculator', 'mdi-laptop', 'mdi-cellphone', 'mdi-monitor',
  'mdi-printer', 'mdi-gamepad-variant', 'mdi-dice-multiple', 'mdi-music', 'mdi-movie',
  'mdi-theater', 'mdi-camera', 'mdi-image', 'mdi-guitar-acoustic', 'mdi-microphone',
  'mdi-heart', 'mdi-heart-pulse', 'mdi-hospital-box', 'mdi-pill', 'mdi-dumbbell',
  'mdi-run', 'mdi-paw', 'mdi-dog', 'mdi-cat', 'mdi-baby-face-outline',
  'mdi-flower', 'mdi-tree', 'mdi-leaf', 'mdi-earth', 'mdi-weather-sunny',
  'mdi-weather-cloudy', 'mdi-beach', 'mdi-map-marker', 'mdi-calendar', 'mdi-clock-outline',
  'mdi-bell', 'mdi-lock', 'mdi-key', 'mdi-shield-check', 'mdi-alert-circle',
  'simple-icons:discord', 'simple-icons:steam', 'mdi-youtube', 'mdi-whatsapp', 'simple-icons:telegram',
  'mdi-github', 'mdi-account-group', 'mdi-account', 'mdi-star', 'mdi-dots-horizontal-circle'
]
const colorOptions = ['#F44336', '#FF7043', '#FFCA28', '#66BB6A', '#26A69A', '#42A5F5', '#5C6BC0', '#AB47BC', '#EC407A', '#607D8B']
const systemCategories = computed(() => store.categories.filter(category => category.system))
const customCategories = computed(() => store.categories.filter(category => !category.system))
const iconScroll = ref<HTMLElement | null>(null)
const canScrollUp = ref(false)
const canScrollDown = ref(true)

function updateIconScrollState() {
  const element = iconScroll.value
  if (!element) return
  canScrollUp.value = element.scrollTop > 2
  canScrollDown.value = element.scrollTop + element.clientHeight < element.scrollHeight - 2
}

function scrollIcons(direction: 'up' | 'down') {
  iconScroll.value?.scrollBy({ top: direction === 'down' ? 180 : -180, behavior: 'smooth' })
}

watch(dialog, async isOpen => {
  if (isOpen) {
    await nextTick()
    updateIconScrollState()
  }
})

onMounted(() => window.addEventListener('resize', updateIconScrollState))
onUnmounted(() => window.removeEventListener('resize', updateIconScrollState))

function openCreate() {
  editingId.value = null
  form.value = { name: '', icon: 'mdi-tag-outline', color: '#607D8B' }
  dialog.value = true
}

function openEdit(category: Category) {
  editingId.value = category.id
  form.value = { name: category.name, icon: category.icon, color: category.color }
  dialog.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  if (editingId.value) await store.update(editingId.value, form.value)
  else await store.create(form.value)
  dialog.value = false
}
</script>

<template>
  <v-main class="app-background category-editor">
    <div class="category-editor__content">
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <div class="text-h5 font-weight-bold">Категории</div>
          <div class="text-body-2 text-medium-emphasis">Ваши категории и доступные системные категории</div>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Добавить</v-btn>
      </div>

      <section class="mb-8">
        <div class="text-subtitle-1 font-weight-bold mb-3">Системные</div>
        <v-list rounded="lg" bg-color="transparent">
          <v-list-item v-for="category in systemCategories" :key="category.id">
            <template #prepend><v-icon :color="category.color">{{ category.icon }}</v-icon></template>
            <v-list-item-title>{{ category.name }}</v-list-item-title>
            <template #append>
              <v-btn v-if="category.hidden" icon="mdi-eye" variant="text" title="Восстановить" @click="store.restoreSystem(category.id)" />
              <v-btn v-else icon="mdi-eye-off-outline" variant="text" title="Скрыть" @click="store.hideSystem(category.id)" />
            </template>
          </v-list-item>
        </v-list>
      </section>

      <section>
        <div class="text-subtitle-1 font-weight-bold mb-3">Мои категории</div>
        <v-list v-if="customCategories.length" rounded="lg" bg-color="transparent">
          <v-list-item v-for="category in customCategories" :key="category.id" :class="{ 'text-medium-emphasis': category.deleted }">
            <template #prepend><v-icon :color="category.color">{{ category.icon }}</v-icon></template>
            <v-list-item-title>{{ category.name }}</v-list-item-title>
            <template #append>
              <v-btn v-if="category.deleted" icon="mdi-restore" variant="text" title="Восстановить" @click="store.restore(category.id)" />
              <template v-else>
                <v-btn icon="mdi-pencil-outline" variant="text" title="Изменить" @click="openEdit(category)" />
                <v-btn icon="mdi-delete-outline" variant="text" title="Удалить" @click="store.remove(category.id)" />
              </template>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="text-body-2 text-medium-emphasis">Пользовательских категорий пока нет.</div>
      </section>
    </div>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>{{ editingId ? 'Изменить категорию' : 'Новая категория' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Название" autofocus />
          <div class="text-caption mb-2">Иконка</div>
          <div class="icon-picker mb-5">
            <button
              v-if="canScrollUp"
              class="icon-scroll-indicator icon-scroll-indicator--top"
              type="button"
              aria-label="Прокрутить иконки вверх"
              @click="scrollIcons('up')"
            >
              <v-icon icon="mdi-chevron-up" size="18" />
            </button>
            <div ref="iconScroll" class="icon-scroll" @scroll="updateIconScrollState">
              <div class="option-grid">
                <v-btn
                  v-for="icon in iconOptions"
                  :key="icon"
                  icon
                  variant="text"
                  :class="{ selected: form.icon === icon }"
                  @click="form.icon = icon"
                >
                  <Icon v-if="icon.includes(':')" :icon="icon" :color="form.color" width="24" height="24" />
                  <v-icon v-else :color="form.color">{{ icon }}</v-icon>
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
            <button v-for="color in colorOptions" :key="color" class="color-option" :class="{ selected: form.color === color }" :style="{ backgroundColor: color }" @click="form.color = color" />
          </div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Отмена</v-btn><v-btn color="primary" @click="save">Сохранить</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-main>
</template>

<style scoped>
.category-editor__content { max-width: 760px; margin: 0 auto; padding: 32px 20px 120px; }
.icon-picker { position: relative; }
.icon-scroll { max-height: 224px; overflow-y: auto; padding: 6px 4px; scrollbar-width: thin; }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option-grid .selected { background: rgba(25, 118, 210, .12); }
.icon-scroll-indicator { position: absolute; left: 50%; z-index: 1; width: 32px; height: 24px; transform: translateX(-50%); border: 0; border-radius: 12px; background: rgba(255, 255, 255, .94); color: #546e7a; box-shadow: 0 2px 8px rgba(38, 50, 56, .18); cursor: pointer; }
.icon-scroll-indicator--top { top: 0; }
.icon-scroll-indicator--bottom { bottom: 0; }
.color-option { width: 30px; height: 30px; border: 2px solid transparent; border-radius: 50%; cursor: pointer; }
.color-option.selected { border-color: #263238; box-shadow: 0 0 0 2px white inset; }
</style>