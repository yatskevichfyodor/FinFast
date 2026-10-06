# Категории расходов

## Типы и владелец

Есть две категории:

- **Системные:** каталог задан клиентом в `client/src/constants/categories.ts`; ID проверяются также backend enum/registry. На сервере для пользователя сохраняется только список скрытых системных ID, не копия всего каталога.
- **Пользовательские:** name/icon/color/ID хранятся локально в IndexedDB по user ID и в expense-service PostgreSQL. Категория имеет optional `hiddenAt`; удаление и скрытие — разные операции.

Состояние UI и computed списки — `client/src/stores/categoryStore.ts`, модели — `client/src/types/category.ts`, picker/editor — `CategoryPicker.vue` и `CategoryEditorView.vue`. REST wrappers — `client/src/services/api/categoryApi.ts`; backend — category controller/service/repository в `services/expense-service/src/main/kotlin/.../category/`.

## API и поведение

Клиент использует `/categories` (custom categories + hidden system IDs), `/categories/custom` и custom-category create/patch/hide/restore/delete/count routes; системные категории имеют hide/restore routes. Точные DTO проверять в `CategoryController` и `categoryApi.ts`.

Backend устанавливает owner из security context. Имя custom category trim-ится; обязательны непустые name/icon/color, имя ограничено 100 символами. Custom category нельзя редактировать, если она скрыта; восстановление возвращает её в доступные. Удаление custom category на сервере очищает обе ссылки category/customCategoryId у активных расходов, затем удаляет категорию. Отдельная проверка количества связанных расходов доступна API.

Hide системной категории — user-scoped запись с composite key; frontend скрывает системную категорию без удаления из исходного каталога. Системные категории/hidden IDs — это не одна и та же сущность, что custom categories.

## Локальное состояние и синхронизация

Custom category records лежат в IndexedDB под `[userId, categoryId]`; скрытые system IDs, время последнего category sync и pending category operations хранятся в user-scoped localStorage. При `loadDataFromStorage()` categoryStore восстанавливает локальные данные. При sync он отправляет pending операции, затем сравнивает сохранённый timestamp с серверным и загружает/сохраняет server snapshot только при несовпадении timestamp.

Данные изменения сервера включают user-scoped `CATEGORY.changedAt`; frontend сравнивает timestamp с локальным последним sync timestamp, чтобы решить, загружать ли категории. Детали очереди и известных проблем — в [category-sync.md](category-sync.md).

## Неоднозначности текущего поведения

1. Backend `getCustomCategories()` включает записи с `hiddenAt`, но создаёт DTO с `hidden=false`. Поэтому full load `/categories` не передаёт скрытое состояние custom категории корректно; клиент заменяет локальный список серверным ответом и может показать скрытую категорию после загрузки.
2. Событие `USER_DELETED` в текущем expense-service удаляет расходы пользователя, но не категории и hidden-category rows. Учитывать возможные остаточные серверные данные после удаления аккаунта.
3. Расходы ссылаются на custom category UUID; категория должна принадлежать аутентифицированному пользователю и быть активной. Нельзя предполагать, что категория guest/local-only будет принята backend.

## Правила изменений

- Сохранять различие system/custom и hidden/deleted.
- При смене DTO согласовать backend, `categoryApi`, `categoryStore`, persistence и операции pending sync.
- Не делать системные категории серверно управляемыми без фактического изменения API/модели.
- Категории привязаны к конкретному пользователю; не смешивать между аккаунтами при смене сессии или guest transfer.
