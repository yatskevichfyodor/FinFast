# Разработка и развертывание

## Local development

Frontend запускается отдельно из `client/` с помощью Vite. Node engine указан в `client/package.json`; workflow CI использует Node 24. Проверки frontend доступны через `npm run type-check`, production build — `npm run build`.

`docker/docker-compose.dev.yml` запускает PostgreSQL, Kafka/Kafka init, auth-service и expense-service JVM images; `docker-compose.dev.native.yml` использует native Dockerfiles. Frontend Compose не запускает. Локальные сервисы опубликованы на 8082 (auth) и 8081 (expense), PostgreSQL на 5432, Kafka external listener на 9094; frontend dev server обычно на 5173.

Compose подключает внешний volume `finfast_postgres-data`; при локальном запуске volume должен существовать. `depends_on` не заменяет readiness/health checks; не считать базу/Kafka готовыми лишь по факту старта контейнеров. `.env.dev` предоставляет локальные настройки и не должен использоваться как источник production secrets.

Для backend конфигурации раздельны и миграции принадлежат своим сервисам. Auth Service и Expense Service используют отдельные Flyway history tables; не запускать migrations вручную или менять уже применённые migration scripts без принятого migration workflow.

## Production pipeline

Оба workflow запускаются при push в branch `production`:

- `pages.yml`: устанавливает Node, выполняет `npm ci` и `npm run build` в `client/`, загружает artifact и публикует на GitHub Pages.
- `deploy.yml`: собирает native images auth-service и expense-service для `linux/amd64`, отправляет теги latest и commit SHA в GHCR, вызывает Render deploy hooks из GitHub secrets.

Vite `base` задан как `/FinFast/`; клиентская конфигурация использует build-time VITE variables. Backend production properties ожидают PORT, DB host/port/name/credentials, Kafka SASL_SSL settings, TLS CA, Auth Service URL и client URL. Сами secret values и Render service settings находятся вне репозитория.

README описывает PostgreSQL на Supabase, Kafka на Aiven, backend hosting на Render и static frontend на GitHub Pages. Backend production configs подтверждают настройки PostgreSQL и TLS/SASL_SSL Kafka; фактические адреса задаются окружением.

## PWA

Vite config подключает `vite-plugin-pwa`, manifest, precache ресурсов, `registerType: 'prompt'`, `skipWaiting` и `clientsClaim`; регистрация и уведомление об обновлении находятся в `client/src/services/pwaUpdate.ts`. При изменении стратегии проверить согласованность prompt UI с service-worker activation flags и сценарий обновления уже открытых clients.

## Правила

- Не коммитить secrets, токены, приватные ключи или реальные `.env` значения.
- Изменения API URL, CORS, JWT issuer/JWKS, Google audience или Kafka security требуют согласованных frontend/backend/deployment config изменений.
- Production native build отличается от JVM dev deployment; проверять тот Dockerfile/workflow, который соответствует изменению.
- Для изменения schema добавлять новую Flyway migration в соответствующий сервис; у auth и expense сервисов свои migration folders/history.
