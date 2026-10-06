# Синхронизация расходов

## Владение логикой и локальная модель

Главный orchestrator — store из `client/src/stores/expenseStore.ts`; локальное хранилище — `client/src/storage/indexedDB/expenseStorage.ts`; REST wrapper и DTO — `client/src/services/api/expenseApi.ts`, `client/src/types/expense.ts`, `client/src/mappers/expenseMappers.ts`. Backend batch endpoint находится в `ExpenseController.sync()` и бизнес-валидация — в `ExpenseService.sync()`.

Каждая локальная запись хранит `isSynced` и `isCreatedLocally`; `deletedAt` означает удаление, ожидающее синхронизации либо пришедшее с сервера. IndexedDB хранит запись под составным ключом `[userId, expenseId]`. Pending локальное состояние нельзя удалять только потому, что сеть недоступна или запрос завершился ошибкой.

## Поток

1. Store меняет локальное состояние и сохраняет его в IndexedDB.
2. Для неанонимного пользователя store запрашивает серверные версии unsynced ID, классифицирует записи как create/update/delete и формирует batch `POST /expenses/sync`.
3. Backend использует authenticated user ID, выполняет batch delete, update, create и обновляет timestamp типа `EXPENSE`.
4. Только после успешного вызова клиент помечает обработанные записи синхронизированными и сохраняет IndexedDB. При отказе pending-маркеры остаются для следующей попытки.
5. `refreshExpenses()` читает IndexedDB, пробует отправить локальные изменения, получает серверный список, merge-ит его с локальным состоянием и сохраняет результат.

Одиночные create/update/delete могут посылаться напрямую, если остальные pending расходы не требуют batch reconciliation. Ошибки таких фоновых запросов логируются; локальное состояние остаётся unsynced. Для конкурентных действий store использует последовательность/коалесцирование операций; не обходить эти guard-ы при добавлении новых путей.

## Запуск и ограничения

Store подписывается на window `online` и запускает refresh только при `navigator.onLine`, неanonymous user и не offline auth mode. Инициализация store также выполняет стартовую проверку. Online event — лишь триггер попытки, фактический REST-ответ определяет успех.

Обычный refresh и batch sync пропускают anonymous user; online listener также явно исключает его. После явного transfer другой пользовательский store отправляет расходы под новым текущим владельцем; пользовательские категории guest профиля не мигрируют вместе с расходами.

**Исключение в текущем коде:** прямой путь одиночного изменения в `updateExpense()` не проверяет anonymous user перед вызовом `updateExpenseOnApi()`. Поэтому при изменении единственного unsynced guest расхода store может попробовать отправить POST/PATCH; для гостя запрос не получает Bearer токен, возможен 401, а auth interceptor может перенаправить на login. Локальная запись при неудаче остаётся unsynced. Не утверждать, что каждое пользовательское действие в anonymous mode гарантированно не вызывает сеть.

Backend включает soft-deleted записи в list/byIds ответы для reconciliation, хотя `GET /expenses/{id}` для удалённого расхода возвращает not found. При локальной загрузке серверные tombstones удаляют соответствующие локальные записи. Учитывать это различие при изменении API.

## Изменения и ошибки

- Любая ошибка GET/batch/single write не должна подтверждать локальный sync.
- Не делать локальную запись synced до ответа API; не очищать unsynced data в logout или при refresh.
- Проверять случай, когда у сервера расход уже есть (update), отсутствует (create), удалён (reconciliation), либо локально помечен на удаление.
- Не изменять user identity, ID или timestamps при retry. Дубликаты устраняются сравнением ID в текущем owner scope.
- API batch последовательно обрабатывает delete/update/create внутри серверной транзакции и обновляет общий expense change timestamp.

Подробности CRUD и composite identity — в [expenses.md](expenses.md), локальная приватность и IndexedDB lifecycle — в [offline-first.md](offline-first.md).
