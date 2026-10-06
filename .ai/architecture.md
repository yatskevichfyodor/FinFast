# Архитектура FinFast

## Назначение и границы

FinFast — клиентское приложение для учёта расходов с двумя независимыми backend-сервисами. Это не один backend-модуль: аутентификация находится в Quarkus `auth-service`, а расходы, категории и связанные с ними REST API — в Spring Boot `expense-service`. Основные части исходников находятся в `client/`, `services/auth-service/` и `services/expense-service/`.

## Стек и ответственность компонентов

- **Frontend:** Vue 3, TypeScript, Vuetify, Pinia, Vue Router, Vite, Axios, PWA; локальное хранилище данных — IndexedDB и `localStorage`.
- **Auth service:** Kotlin, Quarkus, Hibernate ORM, Flyway, PostgreSQL; логин/регистрация, Google OAuth credential verification, refresh tokens, выпуск и публикация ключей JWT/JWKS, управление профилем.
- **Expense service:** Kotlin, Spring Boot, Spring Data JPA/Hibernate, Spring Security Resource Server, Flyway, PostgreSQL; расходы, пользовательские категории, скрытые системные категории и отметки времени изменения данных.
- **Межсервисные события:** Apache Kafka; в текущем коде auth-service записывает событие удаления пользователя в transactional outbox, а expense-service слушает `user-events` и обрабатывает `USER_DELETED`.
- **Внешняя инфраструктура production:** конфигурация рассчитана на PostgreSQL и Kafka с внешними credentials; README описывает Supabase и Aiven, backend production-конфиги используют PostgreSQL/Kafka параметры окружения и TLS. Workflow публикуют backend-образы в GHCR и запускают deploy hooks Render; frontend публикуется в GitHub Pages.

Точные адреса, credentials и фактическая привязка сервисов к инфраструктуре определяются окружением, а не исходниками. Не помещать секреты в клиент или документацию.

## Взаимодействие и потоки данных

1. Vue views/components отвечают за экран и ввод. Pinia stores владеют состоянием и orchestration, API-модули в `client/src/services/api/` инкапсулируют REST-вызовы, storage-модули работают с IndexedDB/localStorage.
2. Frontend вызывает Auth Service через отдельный Axios client (`VITE_AUTH_BASE_URL`): `/auth/*`. Expense Service вызывается другим client (`VITE_API_BASE_URL`): `/expenses/*`, `/categories/*` и endpoints отметок изменений.
3. После входа frontend передаёт access token как Bearer token к защищённому Expense Service. Тот проверяет подпись и issuer JWT с помощью JWKS Auth Service; для владельца ресурса backend берёт user ID из security context/principal.
4. Изменения расходов и категорий сохраняются в локальном состоянии и/или серверной базе согласно соответствующему store. Backend обновляет user-scoped timestamps изменений; frontend использует их для определения необходимости загрузить категории. Подробности см. в [expense-sync.md](expense-sync.md), [category-sync.md](category-sync.md) и [offline-first.md](offline-first.md).
5. При удалении пользователя Auth Service пишет `USER_DELETED` в outbox. Kafka доставляет событие Expense Service. Текущий consumer вызывает удаление расходов пользователя; обработчик не удаляет custom categories, hidden system categories или строки timestamps. Не предполагать, что событие полностью очищает все user-scoped данные Expense Service.

У сервисов отдельные Flyway history tables и миграции. Оба используют конфигурацию PostgreSQL из окружения; физическая топология БД задаётся deployment-конфигурацией. Не считать, что REST-вызовы между auth-service и expense-service используются для CRUD расходов: связь проверки JWT — через JWKS, события — через Kafka.

## Высокоуровневая авторизация

Auth Service проверяет парольные credentials либо Google ID token, выдаёт короткоживущий access JWT и refresh token. На frontend токены и идентификатор пользователя хранятся в localStorage. Axios interceptors добавляют Bearer access token, обновляют токены при локально выявленном истечении срока или 401 и повторяют запрос один раз. Expense Service валидирует access token через JWKS и использует аутентифицированный principal для изоляции пользовательских записей.

Гостевой режим — клиентский профиль `anonymous` без backend identity; он хранит расходы локально и не должен трактоваться backend как authenticated account. Детали и фактические ограничения описаны в [authentication.md](authentication.md).

## Offline-first

Frontend читает/сохраняет расходы в IndexedDB и привязывает записи составным локальным ключом `[userId, expenseId]`; пользовательские категории хранятся отдельно под `[userId, categoryId]`. Дополнительные маркеры, скрытые категории и очереди категорий находятся в localStorage с user-scoped ключами. Сетевой сбой не равнозначен успеху синхронизации: pending-данные должны оставаться локально до подтверждённой операции. Anonymous данные используют отдельный user ID.

Offline-first описывает клиентскую доступность, а не локальный сервер или гарантированный конфликт-резолвер. Синхронизация запускается при предусмотренных store/UI сценариях и online-событии; `navigator.onLine` сам по себе не подтверждает доступность backend. Expense sync сохраняет unsynced записи при неуспешной отправке, но для category queue есть зафиксированный случай потери следующих операций после retryable ошибки; см. [category-sync.md](category-sync.md). Остальные детали и ограничения — в [offline-first.md](offline-first.md).

## Локальный запуск и production

- Frontend запускается отдельно из `client/` через Vite. Compose-файлы в `docker/` поднимают PostgreSQL, Kafka и auth/expense backend-сервисы; frontend туда не входит. JVM и native варианты заданы раздельно.
- Production frontend собирается GitHub Actions и публикуется в GitHub Pages. При push в `production` другой workflow собирает native backend images для `linux/amd64`, публикует в GHCR и вызывает Render deploy hooks. PostgreSQL и Kafka предоставляются внешней инфраструктурой согласно README и переменным окружения.
- Детали портов, workflow, env config и ограничений Compose вынесены в [deployment.md](deployment.md); не копировать значения секретов и не считать локальные env-файлы production источником.

## Где искать код

- `client/src/views/`, `components/` — UI; `stores/` — клиентское состояние и orchestration; `services/api/` — HTTP wrappers; `storage/` — persistence.
- `services/auth-service/src/main/kotlin/` — auth resources, security, services, persistence/outbox.
- `services/expense-service/src/main/kotlin/` — REST controllers, business services, repositories, security и Kafka consumer.
- `services/*/src/main/resources/db/migration/` — независимые Flyway migrations каждого сервиса.
