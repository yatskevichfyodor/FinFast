<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import ExportDialog from "@/components/ExportDialog.vue";
import ImportDialog from "@/components/ImportDialog.vue";
import LogoutConfirmationDialog from "@/components/LogoutConfirmationDialog.vue";
import AccountDialog from "@/components/AccountDialog.vue";
import { updateAvailable, updatePwa } from "@/services/pwaUpdate";
import { format } from "date-fns/format";
import { useExpenseStore } from "@/stores";
import { useI18n } from "vue-i18n";
import { setLocale, type AppLocale } from "@/i18n";
import { useCurrencyStore } from "@/stores/currencyStore";
import { CURRENCY_OPTIONS, isCurrencyCode } from "@/types/currency";
import CurrencySymbol from "@/components/CurrencySymbol.vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const router = useRouter();
const { t, locale } = useI18n();
const authStore = useAuthStore();
const currencyStore = useCurrencyStore();
const expenseStore = useExpenseStore().value!;
const currencyNames = computed(
  () => new Intl.DisplayNames([locale.value], { type: "currency" }),
);
const currencyItems = computed(() =>
  CURRENCY_OPTIONS.map(({ code }) => ({
    value: code,
    title: currencyNames.value.of(code) ?? code,
  })),
);

const localOpen = ref(props.modelValue);
const showExportDialog = ref(false);
const showImportDialog = ref(false);
const showLogoutDialog = ref(false);
const showAccountDialog = ref(false);
const pendingExpensesCount = computed(() =>
  expenseStore ? expenseStore.getNotSyncedExpensesCount() : null,
);
const shouldShowLogin = computed(
  () =>
    !authStore.isAuthenticated ||
    authStore.isAnonymous ||
    authStore.authSessionIssue,
);

const buildInfo = computed(() => {
  const buildNumber = import.meta.env.VITE_BUILD_NUMBER || "dev";
  const gitCommit = import.meta.env.VITE_GIT_COMMIT || "local";
  const shortCommit =
    gitCommit.length > 7 ? gitCommit.substring(0, 7) : gitCommit;
  return `Build #${buildNumber} · ${shortCommit} · ${format(new Date(__BUILD_TIME__), "yyyy.MM.dd. HH:mm")}`;
});

watch(
  () => props.modelValue,
  (v) => (localOpen.value = v),
);
watch(localOpen, (v) => emit("update:modelValue", v));

onMounted(() => {
  if (authStore.accessToken && !authStore.isAnonymous) {
    void authStore.loadCurrentUser();
  }
});

function closeMenu() {
  localOpen.value = false;
}

function changeLocale(value: string) {
  if (value === "ru" || value === "en") setLocale(value as AppLocale);
}

function changeCurrency(value: unknown) {
  if (isCurrencyCode(value)) currencyStore.setCurrency(value);
}

function openExport() {
  closeMenu();
  showExportDialog.value = true;
}

function openImport() {
  closeMenu();
  showImportDialog.value = true;
}

async function logout() {
  if (shouldShowLogin.value) {
    await goToLogin();
    return;
  }

  if (pendingExpensesCount.value && pendingExpensesCount.value > 0) {
    closeMenu();
    showLogoutDialog.value = true;
    return;
  }

  await completeLogout();
}

async function completeLogout() {
  closeMenu();
  showLogoutDialog.value = false;
  await authStore.logout();
  await router.replace({ name: "login" });
}

async function goToLogin() {
  closeMenu();
  if (!authStore.isAnonymous && !authStore.authSessionIssue) {
    await authStore.logout();
  }
  await router.replace({ name: "login" });
}

function openAccountDialog() {
  closeMenu();
  showAccountDialog.value = true;
}

async function openCategories() {
  closeMenu();
  await router.push({ name: "categories" });
}

async function updateApplication() {
  await updatePwa();
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeMenu();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="menu-backdrop">
      <div
        v-show="localOpen"
        class="menu-backdrop"
        @click="handleBackdropClick"
      >
        <Transition name="menu-slide">
          <div v-show="localOpen" class="user-menu">
            <div class="menu-header">
              <v-avatar
                class="menu-avatar"
                color="light-blue-lighten-5"
                size="46"
              >
                <v-icon color="light-blue-darken-2" size="28"
                  >mdi-account</v-icon
                >
              </v-avatar>
              <div class="menu-user-info">
                <span class="menu-username">{{
                  authStore.isAnonymous ? t("menu.guest") : authStore.username || t("menu.user")
                }}</span>
              </div>
            </div>

            <div class="menu-content">
              <div v-if="authStore.authSessionIssue" class="auth-issue-item">
                <v-alert
                  class="auth-issue-alert"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  icon="mdi-cloud-alert-outline"
                >
                  {{ t("menu.sessionIssue") }}
                </v-alert>
                <v-btn
                  class="auth-issue-action"
                  color="primary"
                  variant="tonal"
                  size="small"
                  @click="goToLogin"
                >
                  {{ t("menu.loginAgain") }}
                </v-btn>
                <v-divider class="my-2" />
              </div>

              <div v-if="updateAvailable" class="update-menu-item">
                <div class="update-menu-label">
                  <v-icon class="menu-icon update-menu-icon">mdi-update</v-icon>
                  <span>{{ t("menu.updateAvailable") }}</span>
                </div>
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  @click="updateApplication"
                >
                  {{ t("menu.update") }}
                </v-btn>
                <v-divider class="my-2" />
              </div>

              <template
                v-if="authStore.isAuthenticated && !authStore.isAnonymous"
              >
                <v-btn
                  variant="text"
                  class="menu-button"
                  @click="openAccountDialog"
                >
                  <template #prepend>
                    <v-icon class="menu-icon">mdi-account-cog-outline</v-icon>
                  </template>
                  {{ t("menu.account") }}
                </v-btn>

                <v-divider class="my-2" />
              </template>

              <v-btn variant="text" class="menu-button" @click="openCategories">
                <template #prepend>
                  <v-icon class="menu-icon" color="teal-darken-1"
                    >mdi-tag-multiple</v-icon
                  >
                </template>
                {{ t("menu.categories") }}
              </v-btn>

              <v-divider class="my-2" />

              <div class="locale-picker">
                <div class="locale-picker-label">
                  <v-icon class="menu-icon">mdi-translate</v-icon>
                  <span>{{ t("locale.label") }}</span>
                </div>
                <v-btn-toggle
                  :model-value="locale"
                  class="locale-toggle"
                  color="primary"
                  divided
                  mandatory
                  density="compact"
                  @update:model-value="changeLocale"
                >
                  <v-btn value="ru">{{ t("locale.russian") }}</v-btn>
                  <v-btn value="en">{{ t("locale.english") }}</v-btn>
                </v-btn-toggle>
              </div>

              <v-divider class="my-2" />

              <div class="currency-picker">
                <div class="locale-picker-label">
                  <v-icon class="menu-icon">mdi-currency-usd</v-icon>
                  <span>{{ locale === "ru" ? "Валюта расходов" : "Expense currency" }}</span>
                </div>
                <v-select
                  :model-value="currencyStore.currency"
                  :items="currencyItems"
                  item-title="title"
                  item-value="value"
                  :menu-props="{ zIndex: 3000, width: 268, maxWidth: 'calc(85vw - 32px)' }"
                  density="compact"
                  variant="outlined"
                  hide-details
                  @update:model-value="changeCurrency"
                >
                  <template #selection="{ item }">
                    <span class="currency-selection">
                      <span class="currency-symbol-badge">
                        <CurrencySymbol :currency="item.value" :size="16" />
                      </span>
                      <span class="currency-selection-name">{{ item.title }}</span>
                    </span>
                  </template>
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" class="currency-option">
                      <template #prepend>
                        <span class="currency-symbol-badge currency-symbol-badge-option">
                          <CurrencySymbol :currency="item.value" :size="16" />
                        </span>
                      </template>
                      <template #title>{{ item.title }}</template>
                      <template #subtitle>{{ item.value }}</template>
                      <template #append>
                        <v-icon
                          v-if="item.value === currencyStore.currency"
                          icon="mdi-check"
                          color="primary"
                          size="18"
                        />
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </div>

              <v-divider class="my-2" />

              <v-btn variant="text" class="menu-button" @click="openImport">
                <template #prepend>
                  <v-icon class="menu-icon menu-icon-import"
                    >mdi-file-upload-outline</v-icon
                  >
                </template>
                {{ t("menu.import") }}
              </v-btn>

              <v-btn variant="text" class="menu-button" @click="openExport">
                <template #prepend>
                  <v-icon class="menu-icon menu-icon-export"
                    >mdi-file-download-outline</v-icon
                  >
                </template>
                {{ t("menu.export") }}
              </v-btn>
            </div>

            <div class="menu-footer">
              <v-btn
                variant="text"
                class="menu-button menu-button-logout"
                @click="logout"
              >
                <template #prepend>
                  <v-icon
                    :class="
                      shouldShowLogin
                        ? 'menu-icon menu-icon-login'
                        : 'menu-icon menu-icon-logout'
                    "
                  >
                    {{ shouldShowLogin ? "mdi-login" : "mdi-logout" }}
                  </v-icon>
                </template>
                {{ shouldShowLogin ? t("menu.login") : t("menu.logout") }}
              </v-btn>
              <div class="menu-build-info">{{ buildInfo }}</div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <ExportDialog v-model="showExportDialog" />
    <ImportDialog v-model="showImportDialog" />
    <template v-if="pendingExpensesCount">
      <LogoutConfirmationDialog
        v-model="showLogoutDialog"
        :pending-expenses-count="pendingExpensesCount"
        @confirm="completeLogout"
      />
    </template>
    <AccountDialog v-model="showAccountDialog" />
  </Teleport>
</template>

<style scoped>
.menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.user-menu {
  width: 300px;
  max-width: 85vw;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  color: #263238;
}

.menu-avatar {
  flex: 0 0 auto;
}

.menu-user-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-user-label {
  color: #78909c;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.menu-username {
  font-size: 18px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.menu-button {
  width: 100%;
  justify-content: flex-start;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  text-transform: none;
}

.menu-icon {
  font-size: 24px;
}

.locale-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.currency-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.currency-selection {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.currency-symbol-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  width: 34px;
  height: 28px;
  border-radius: 8px;
  background: #eef4fb;
  color: #35566f;
  font-size: 13px;
  font-weight: 700;
}

.currency-symbol-badge-option {
  flex-basis: 38px;
  width: 38px;
  height: 30px;
}

.currency-selection-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.currency-option :deep(.v-list-item__prepend) {
  margin-inline-end: 12px;
}

.currency-option :deep(.v-list-item-title) {
  font-weight: 600;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

.currency-option :deep(.v-list-item__content) {
  min-width: 0;
}

.currency-option :deep(.v-list-item-subtitle) {
  font-size: 11px;
  letter-spacing: 0.08em;
}

.locale-picker-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #546e7a;
}

.locale-toggle {
  width: 100%;
}

.locale-toggle :deep(.v-btn) {
  flex: 1;
  text-transform: none;
}

.menu-icon-import {
  color: #1976d2;
}

.menu-icon-export {
  color: #2e7d32;
}

.update-menu-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
  color: #c62828;
}

.auth-issue-item {
  padding: 0 12px;
}

.auth-issue-alert {
  font-size: 0.875rem;
}

.auth-issue-action {
  margin-top: 8px;
  width: 100%;
}

.update-menu-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  font-size: 16px;
  font-weight: 600;
}

.update-menu-icon {
  color: #c62828;
}

.menu-icon-login {
  color: #00897b;
}

.menu-icon-logout {
  color: #d32f2f;
}

.menu-button-logout {
  color: #263238;
}

.menu-button-logout:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
}

.menu-build-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 11px;
  color: #9e9e9e;
  text-align: center;
  font-weight: 400;
  letter-spacing: 0.02em;
}

/* Slide-in animation */
.menu-backdrop-enter-active,
.menu-backdrop-leave-active {
  transition: opacity 0.3s ease;
}

.menu-backdrop-enter-from,
.menu-backdrop-leave-to {
  opacity: 0;
}

.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: transform 0.3s ease;
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  transform: translateX(100%);
}

@media (max-width: 600px) {
  .user-menu {
    width: 280px;
  }

  .menu-username {
    max-width: 180px;
    font-size: 16px;
  }

  .menu-button {
    height: 44px;
    font-size: 15px;
  }
}
</style>
