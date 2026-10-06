# Синхронизация категорий

## Компоненты и данные

`categoryStore` в `client/src/stores/categoryStore.ts` координирует загрузку, local state и вызовы `createCategorySyncService` (`client/src/services/categorySyncService.ts`). API wrapper — `categoryApi.ts`; server endpoints и business rules — category controller/service Expense Service. User data timestamps обслуживаются `dataChangesStore`, `dataChangesApi` и backend `userdatachange` package.

Очереди пользовательских и системных категорий — две независимые JSON очереди в localStorage, каждая с user-scoped ключом. Custom очередь содержит `CREATE`, `UPDATE`, `DELETE`, `HIDE`, `RESTORE`; system очередь — `HIDE`/`RESTORE`. Это отдельный механизм от IndexedDB расходов.

## Попытки и retry

Изменение сначала пытается выполниться напрямую через API. Для **Axios errors** без HTTP response, 401 или HTTP 5xx операция помещается в соответствующую очередь; не-Axios errors и прочие ответы считаются не retryable и пробрасываются. При отправке очереди те же retryable ошибки оставляют операцию pending; HTTP ошибки иные, чем 401/5xx, логируются и операция удаляется как завершённая с точки зрения очереди.

`sendPendingOperations()` последовательно отправляет сначала custom, затем system operations. Затем categoryStore сравнивает `CATEGORY.changedAt` сервера с локальным timestamp и перечитывает `/categories` только при несовпадении. Ошибка fetch логируется; server snapshot не заменяется успешно полученными данными.

## Известный риск потери очереди

В обеих функциях `sendPendingCustomCategoryOperations()` и `sendPendingSystemCategoryOperations()` цикл при первой retryable неудаче добавляет только эту операцию в `remaining`, делает `break`, а затем сохраняет `remaining`. Все операции, которые шли после неудачной, в этот массив не попадают и теряются. Не предполагать FIFO-очередь с полным сохранением хвоста; при исправлении сохранять текущую и все следующие непройденные операции.

## Ещё одна проблема server snapshot

Backend snapshot `/categories` сейчас возвращает custom records включая hidden, но DTO формируется с `hidden=false`; клиент использует snapshot как authoritative local list. Это может раскрывать скрытые категории в UI после sync. Также category deletion account event очищает расходы, но текущий Kafka consumer не чистит category state.

## Рекомендации агенту

- Согласованно менять сразу custom/system ветки там, где логика дублируется.
- Различать временные (отложить/retry) и окончательные (лог/удаление из очереди) ошибки так, как делает текущий код; не расширять retry на все 4xx автоматически.
- Очереди из localStorage — user-scoped и должны оставаться привязанными к тому же user ID.
- При изменении timestamp sync проверять API `GET` отметок данных и определение `CATEGORY.changedAt`, а не полагаться лишь на локальное время.
- Не делать изменения категорий через компонент напрямую: менять API/service и store в их слоях.

Модель и доменные ограничения см. в [categories.md](categories.md); общее local persistence — в [offline-first.md](offline-first.md).
