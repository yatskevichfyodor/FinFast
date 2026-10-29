# Аутентификация и учётная запись

## Границы функциональности

Auth Service — отдельное Kotlin/Quarkus приложение (`services/auth-service`), а не часть Spring Boot Expense Service. Он предоставляет REST API регистрации, логина, Google-входа, обновления/отзыва refresh token, получения профиля и управления учётной записью. Frontend-вызовы и DTO находятся в `client/src/services/api/authApi.ts`; auth state — в `client/src/stores/authStore.ts`; HTTP clients/interceptors — в `client/src/services/api/http.ts` и `client/src/services/interceptors.ts`.

Passkey flow использует `/auth/passkey/register`, `/auth/passkey/login` и защищённый `/auth/passkey/link`; options endpoints возвращают открытые `challenge` и случайный `challengeId`, которые клиент держит в памяти и передаёт в callback payload. `passkey_challenges` (Flyway V6/V7) хранит challenge, expiry, purpose и username/subject контекст; backend сравнивает присланные значения с записью, проверяет WebAuthn assertion/attestation, origin и RP ID, затем атомарно удаляет challenge. TTL — пять минут; схема работает с несколькими backend-инстансами и не требует cookies или challenge JWT. После успешной WebAuthn-проверки auth-service возвращает ту же пару access/refresh tokens, что и при других способах входа. Привязка passkey берёт user ID из Bearer principal, не из payload. WebAuthn credential records хранятся в `webauthn_credentials` (Flyway V5), FK связан с `users`, credential ID глобально уникален. Защищённый `/auth/passkey/unlink` удаляет credentials на сервере и возвращает их IDs вместе с RP ID; frontend best-effort вызывает `PublicKeyCredential.signalUnknownCredential()` для каждого ID, чтобы поддерживаемые менеджеры passkey могли скрыть/удалить credential. Уведомление оппортунистическое: отсутствие поддержки или ошибка браузерного API не отменяет отвязку на сервере.

Endpoints в `AuthResource` и `AccountResource` включают `/auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, JWKS и защищённые `/auth/me` операции профиля, пароля, привязки Google и удаления аккаунта. Passkey endpoints описаны выше. Сверять фактические DTO/HTTP semantics с ресурсами перед изменением контракта.

## Токены и проверка

- Password login, Google sign-in и passkey login/registration возвращают access и refresh token. Google credential проверяется backend с настроенным Google client ID; frontend не должен считать credential проверенным до ответа сервиса. Passkey assertion и registration response проверяются auth-service через WebAuthnSecurity.
- Auth Service публикует JWKS endpoint, подписывает JWT; конфигурация задаёт issuer `finfast-api` и access-token lifetime 900 секунд. Expense Service проверяет JWT signature через JWKS auth-service и issuer.
- Refresh tokens хранятся сервером в форме хеша; refresh/logout API принимают refresh token. Не хранить пароль в localStorage/IndexedDB и не переносить доверие к user ID из произвольного клиентского payload.
- Frontend хранит access token, refresh token, user ID/username и срок access token в localStorage. Interceptors прикладывают Bearer token, обновляют его по локальной отметке срока или 401 через single-flight refresh, повторяют исходный запрос один раз. Из interceptor flows исключены только `/auth/login`, `/auth/register`, `/auth/refresh` и `/auth/google`; `/auth/logout` не входит в этот список и проходит обычную обработку interceptors.
- Logout сначала очищает локальные auth-поля/localStorage; затем best-effort вызывает серверный logout, если был refresh token. При ошибке сети серверный refresh token мог остаться действительным до собственного срока/отзыва, но локальная сессия уже закрыта.
- При инициализации `authStore` начальные refs читают реальные storage keys; вспомогательная `restoreUserFromStorage()` дополнительно читает литералы `"USER_ID_KEY"`/`"USERNAME_KEY"` вместо констант и при наличии таких одноимённых записей может перезаписать `userId`. Это несогласованность текущего кода, не контракт хранения.

## Демонстрационный режим

Auth Service включает режим через `DEMO_MODE=true`; `DEMO_ALLOWED_EMAILS` — список разрешённых Google email через запятую. В режиме доступны регистрация паролем только под именем `demo` (без учёта регистра) и создание Google-аккаунта только для подтверждённого адреса из списка. Обычная регистрация через passkey отключена, поскольку в этом потоке нет email для проверки. Backend запрещает привязывать Google/email или passkey к аккаунту `demo`, менять его имя и удалять его. Клиентское предупреждение управляется build-time переменной `VITE_DEMO_MODE=true`; серверная проверка является обязательной.

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
