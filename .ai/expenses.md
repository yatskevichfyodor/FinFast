# Расходы: модель, CRUD и правила владения

## Модель

Frontend-модель `Expense` находится в `client/src/types/expense.ts`. Основные бизнес-поля: UUID `id`, сумма, системная `categoryId` и/или `customCategoryId`, `createdAt`, описание, `paymentDate`. Клиентские поля `isSynced`, `isCreatedLocally` и `deletedAt` описывают состояние локальной синхронизации/мягкого удаления; это не все серверные поля и их нельзя отправлять как публичный API-контракт.

Backend entity `Expense` (`services/expense-service/.../expense/Expense.kt`) использует `@EmbeddedId ExpenseId(userId, expenseId)`. Логический серверный ключ — пара пользователя и расхода; один UUID расхода не является глобальной идентичностью. Все чтение/изменение ограничивается текущим пользователем из Spring Security через `CurrentUser`; `userId` от frontend не назначает владельца.

Сумма хранится как `numeric(19,2)`/`BigDecimal`, времена создания/удаления — Instant, дата оплаты на backend — `LocalDate`. На frontend `paymentDate` — дата без времени и timezone. Соблюдать мапперы в `client/src/mappers/expenseMappers.ts` при изменении полей.

## Компоненты и API

UI формы/истории — `ExpenseFormView.vue`, `ExpenseHistoryView.vue` и компоненты ввода/категорий; клиентская логика — store в `client/src/stores/expenseStore.ts`; REST wrapper — `client/src/services/api/expenseApi.ts`. Backend: `ExpenseController` → `ExpenseService` → repository/JPA → PostgreSQL.

Текущие маршруты Expense Service: `GET /expenses`, `GET /expenses/{id}`, `GET /expenses?ids=...`, `POST /expenses`, `PATCH /expenses/{id}`, `DELETE /expenses/{id}`, `POST /expenses/sync`. DTO и детали soft delete брать из controller/service, не выводить из названия маршрута. Защищённые запросы требуют Bearer JWT.

Backend проверяет системную категорию по реестру системных категорий и пользовательскую категорию по текущему пользователю; скрытая custom category недоступна для назначения. Patch может явно очистить назначение обеих категорий через `clearCategory`. Удаление — soft delete с `deletedAt`, ежедневная задача очищает достаточно старые soft-deleted записи (срок и cron смотреть в коде/config).

## Локальная обработка

Store сначала записывает создание/обновление/удаление в IndexedDB. Созданный только локально расход при удалении удаляется локально без серверного вызова; серверно существующий расход помечается `deletedAt` и как unsynced. CRUD может отправлять одиночный API-запрос при отсутствии других pending операций; ошибки фоновой отправки логируются, локальная запись остаётся unsynced для будущей попытки.

Данные IndexedDB изолированы по `userId`; store создаётся с ID конкретного профиля. Не обращаться к расходам другого user ID и не трактовать пустой ответ API как разрешение удалить unsynced локальные изменения. Синхронизация подробно описана в [expense-sync.md](expense-sync.md), общие правила профилей/offline — в [offline-first.md](offline-first.md).

## Фактическое поведение импорта/переноса

Import/export — отдельная функциональность ([import-export.md](import-export.md)). Anonymous transfer в `expenseStore` фильтрует дубликаты по ID, добавляет оставшиеся guest expenses в текущий пользовательский store, затем синхронизирует и очищает guest expenses. Категории при этой операции не передаются. Если transferred expense ссылается на guest custom category, backend-валидация категории может отклонить sync.

## Известное несоответствие persistence

JPA-модель задаёт embedded composite ID, однако проверенная начальная migration расходов создаёт таблицу без явного primary key/unique constraint на `(user_id, id)`; проверенная migration категорий constraint для расходов не добавляет. Это расхождение между ORM-моделью и SQL-схемой нужно учитывать при работе с идентичностью и migrations, не предполагать, что уникальность обеспечена базой. Любое изменение схемы требует новой Flyway migration соответствующего expense-service.

## Правила изменений

- Сохранять composite identity `userId + expenseId`; поискать все repository queries/DTO/mappers перед изменением ID.
- Проверять ownership и category ownership на backend service; frontend validation не заменяет backend.
- Не терять `isSynced = false` данные при merge/reload и не менять soft-delete на физическое удаление без анализа sync.
- Поля даты/суммы имеют разные типы на frontend/API/DB — обновлять mapping и валидацию согласованно.
