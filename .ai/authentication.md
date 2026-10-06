# Аутентификация и учётная запись

## Границы функциональности

Auth Service — отдельное Kotlin/Quarkus приложение (`services/auth-service`), а не часть Spring Boot Expense Service. Он предоставляет REST API регистрации, логина, Google-входа, обновления/отзыва refresh token, получения профиля и управления учётной записью. Frontend-вызовы и DTO находятся в `client/src/services/api/authApi.ts`; auth state — в `client/src/stores/authStore.ts`; HTTP clients/interceptors — в `client/src/services/api/http.ts` и `client/src/services/interceptors.ts`.

Endpoints в `AuthResource` и `AccountResource` включают `/auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, JWKS и защищённые `/auth/me` операции профиля, пароля, привязки Google и удаления аккаунта. Сверять фактические DTO/HTTP semantics с ресурсами перед изменением контракта.

## Токены и проверка

- Password login и Google sign-in возвращают access и refresh token. Google credential проверяется backend с настроенным Google client ID; frontend не должен считать credential проверенным до ответа сервиса.
- Auth Service публикует JWKS endpoint, подписывает JWT; конфигурация задаёт issuer `finfast-api` и access-token lifetime 900 секунд. Expense Service проверяет JWT signature через JWKS auth-service и issuer.
- Refresh tokens хранятся сервером в форме хеша; refresh/logout API принимают refresh token. Не хранить пароль в localStorage/IndexedDB и не переносить доверие к user ID из произвольного клиентского payload.
- Frontend хранит access token, refresh token, user ID/username и срок access token в localStorage. Interceptors прикладывают Bearer token, обновляют его по локальной отметке срока или 401 через single-flight refresh, повторяют исходный запрос один раз. Из interceptor flows исключены только `/auth/login`, `/auth/register`, `/auth/refresh` и `/auth/google`; `/auth/logout` не входит в этот список и проходит обычную обработку interceptors.
- Logout сначала очищает локальные auth-поля/localStorage; затем best-effort вызывает серверный logout, если был refresh token. При ошибке сети серверный refresh token мог остаться действительным до собственного срока/отзыва, но локальная сессия уже закрыта.
- При инициализации `authStore` начальные refs читают реальные storage keys; вспомогательная `restoreUserFromStorage()` дополнительно читает литералы `"USER_ID_KEY"`/`"USERNAME_KEY"` вместо констант и при наличии таких одноимённых записей может перезаписать `userId`. Это несогласованность текущего кода, не контракт хранения.

## Offline и guest account

- `continueWithoutAccount()` создаёт локальную сессию с `userId = "anonymous"`, `isAnonymous = true` и флагами offline/anonymous в localStorage. Это не регистрация и не серверный пользователь.
- Экран входа предлагает продолжить без аккаунта, когда Auth Service недоступен. Профиль anonymous используется для локального хранения расходов, backend API в этом режиме не является источником синхронизации.
- UI предлагает перенос расходов после входа и требует выбора пользователя; сам store переносит только расходы, не категории. Пропуск диалога оставляет исходные расходы guest-профиля на устройстве.
- **Текущее противоречивое поведение:** `saveTokens()` удаляет `finfast-anonymous-mode-enabled`, а `AuthView.continueAfterLogin()` проверяет этот ключ только после `login()`/`loginWithGoogle()`. Поэтому предложенный поток переноса после успешного входа может не обнаружить guest-расходы. Не считайте экран переноса гарантированно работающим и не изменяйте этот процесс как часть несвязанной задачи.

Подробнее о сохранении по профилям и logout см. [offline-first.md](offline-first.md); собственно передача данных описана в [expenses.md](expenses.md).

## Учётная запись и удаление

`/auth/me` получает идентичность из Quarkus `SecurityIdentity`, а не из тела запроса. Пользователь может обновлять username, задавать пароль, привязывать/отвязывать Google; backend требует пароль перед отвязкой Google. Удаление аккаунта удаляет refresh tokens и запись пользователя, пишет transactional outbox event `USER_DELETED` и отвечает accepted. Очистка данных Expense Service происходит асинхронно через Kafka и текущий consumer удаляет только расходы; удаление всех типов пользовательских данных не гарантируется (см. [architecture.md](architecture.md) и [categories.md](categories.md)).

## Правила изменений

- Проверять одновременно frontend API wrapper/store, auth resource/service/DTO, соответствующую схему и настройки окружения.
- Сохранять правило: текущую идентичность для защищённых данных устанавливает backend security context.
- Не путать local guest mode, offline ранее вошедшего пользователя и authenticated запрос; см. фактические определения `isAnonymous`, `isOffline` и router guard.
- При изменении token lifecycle проверить interceptor повторные запросы, single-flight refresh, локальную очистку при logout и работу при недоступном сервисе.
