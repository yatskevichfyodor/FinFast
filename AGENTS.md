# AGENTS.md

## Purpose

Provide an AI coding agent with the essential, project-specific knowledge needed to make safe and consistent changes in FinFast.

## Project overview

FinFast is an offline-first personal expense tracker.

Repository structure:

* `backend/` — Kotlin + Spring Boot REST API
* `client/` — Vue 3 + TypeScript frontend

Main technologies:

### Backend

* Kotlin
* Spring Boot
* Spring Data JPA / Hibernate
* Spring Security
* JWT authentication
* Flyway
* H2

### Frontend

* Vue 3
* TypeScript
* Vite
* Vuetify
* Pinia
* Vue Router
* Axios
* IndexedDB

The frontend communicates with the backend through REST API.

---

## Build and run

### Backend

From `backend/`:

```powershell
.\gradlew.bat build
```

Run:

```powershell
.\gradlew.bat bootRun
```

Default port:

```text
http://localhost:8081
```

H2 console:

```powershell
.\gradlew.bat h2Console
```

### Frontend

From `client/`:

```powershell
npm install
npm run dev
```

Build:

```powershell
npm run build
```

Default Vite development server:

```text
http://localhost:5173
```

---

# Architecture

## Backend

General request flow:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Controllers should remain thin. Business logic belongs in services.

Services are responsible for:

* business rules;
* validation;
* authorization/ownership checks;
* interaction with repositories.

Do not put business logic into controllers unless it is strictly request/response related.

### Important backend files

* Application entry point:
  `backend/src/main/kotlin/org/example/finfast/Application.kt`

* Expense controller:
  `backend/src/main/kotlin/org/example/finfast/expense/ExpenseController.kt`

* Expense service:
  `backend/src/main/kotlin/org/example/finfast/expense/service/ExpenseService.kt`

* Authentication:
  `backend/src/main/kotlin/org/example/finfast/auth/`

* Configuration:
  `backend/src/main/resources/application.yml`

* Flyway migrations:
  `backend/src/main/resources/db/migration/`

---

# Authentication and security

The backend uses Spring Security and JWT authentication.

Services must determine the currently authenticated user from the Spring Security context rather than trusting a `userId` supplied by the client.

Never allow the client to choose or override the owner of an authenticated resource.

When working with expenses, always enforce ownership on the backend.

The frontend authentication logic is located in:

* `client/src/services/authApi.ts`
* `client/src/services/api.ts`

`api.ts` contains the Axios instance and authentication-related interceptors.

---

# Expense identity

An expense is logically identified by:

```text
expenseId + userId
```

The same `expenseId` may therefore exist for different users.

Do not assume that `expenseId` is globally unique across all users.

Search for `ExpenseId` and existing composite-key implementations before changing expense persistence logic.

Repository methods may use Spring Data method-name queries such as:

```text
findAllByExpenseId_UserIdOrderByCreatedAtDesc
```

Follow the existing composite-key pattern rather than introducing a different identifier model.

---

# Database and migrations

The backend uses Flyway for schema management.

Database:

```text
H2 file database
jdbc:h2:file:./data/finfast
```

Local database file:

```text
backend/data/finfast.mv.db
```

When changing the database schema:

1. Create a new Flyway migration.
2. Do not modify an already-applied migration.
3. Use the next migration version:
   `V{n}__description.sql`
4. Update seed/test data when necessary.

Do not make schema changes only through JPA annotations without creating the corresponding Flyway migration.

---

# Frontend architecture

Important frontend directories:

```text
client/src/
├── components/
├── views/
├── services/
└── stores/
```

### API layer

`client/src/services/api.ts`

Contains the Axios instance and common HTTP configuration.

API-specific wrappers:

* `client/src/services/authApi.ts`
* `client/src/services/expenseApi.ts`

Keep REST calls inside the service/API layer rather than directly inside Vue components.

If an API contract changes, update the corresponding service wrapper and all affected consumers.

### State management

Pinia is used for application state.

Expense-related state and synchronization logic belongs in the expense store rather than being duplicated across components.

### Vue components

Keep components focused on presentation and UI interaction.

Avoid putting large amounts of business logic, API calls, or synchronization logic directly into Vue components.

If a component becomes large, extract logic into:

* a child component;
* a composable;
* a Pinia store;
* or a service,

depending on the responsibility.

---

# Offline-first architecture

Offline support is a core feature of FinFast.

The frontend must be able to work without a connection to the backend.

Local expense data is stored in IndexedDB.

Expenses may exist in one of several states:

* synchronized;
* pending synchronization;
* deleted locally / pending deletion;
* updated locally / pending update.

Do not assume that a successful local operation means the backend has already been updated.

Local changes must be preserved until synchronization succeeds.

---

# Anonymous mode

FinFast supports using the application without an authenticated account.

When the user chooses:

**"Продолжить без аккаунта"**

a local anonymous profile is used.

Expenses created in anonymous mode are stored locally and associated with that anonymous profile.

Anonymous expenses are not automatically associated with an authenticated account.

When the user later authenticates, the application can offer to transfer the anonymous expenses to the authenticated account.

The user must explicitly confirm the transfer.

Do not silently merge anonymous data into an account.

---

# Offline authenticated mode

A user who has previously authenticated on the device may continue using FinFast offline.

Offline access is based on the locally stored session/account information.

If the user explicitly logs out:

* the local authenticated session must be removed;
* the user must no longer be able to access that account's expenses offline;
* unsynchronized expenses must NOT be deleted.

This is important because logout is also a privacy/security action. A user may log out specifically to prevent another person using the device from seeing their financial data.

---

# Synchronization

Synchronization should be treated as a separate concern from local data manipulation.

General flow:

```text
Local change
    ↓
IndexedDB
    ↓
pending
    ↓
Internet/backend available
    ↓
API request
    ↓
success
    ↓
mark as synchronized
```

Do not delete pending local data before the corresponding backend operation succeeds.

`navigator.onLine` can be used as an indication that a network connection may exist, but it must not be treated as proof that the backend is reachable.

The actual API request determines whether synchronization succeeded.

When implementing synchronization:

* avoid creating duplicate expenses;
* preserve `expenseId`;
* use the authenticated `userId` from the backend security context;
* handle create/update/delete operations separately;
* do not lose pending changes when requests fail.

---

# Logout with unsynchronized changes

Logout must work even when the application is offline.

If the user has unsynchronized expenses, inform the user that those changes remain only on the current device until the user logs in again and synchronization can occur.

Do not block logout solely because there are pending changes.

Do not delete pending changes during logout.

After logout, those pending expenses must not be visible to another user using the same device.

---

# Export and import

FinFast supports exporting data for three purposes:

1. transferring data to another account;
2. transferring unsynchronized/local data to another device;
3. viewing and working with data in Excel.

The export and import dialogs are implemented as Vue components:

* `client/src/components/ExportDialog.vue` — export dialog with format selection;
* `client/src/components/ImportDialog.vue` — import dialog with file selection and validation;

Both components are located in the expense history view.

Export/import logic is implemented in service modules:

* `client/src/services/expenseExport.ts` — export to JSON/CSV formats;
* `client/src/services/expenseImport.ts` — import from JSON with validation and duplicate detection.

## Export formats

The export dialog provides two formats:

### JSON

Description:

**"Для переноса данных и резервного копирования"**

JSON is the machine-readable FinFast data format.

JSON must contain:

* `expenseId`
* `amount`
* `categoryId` (optional)
* `createdAt`

JSON must NOT contain:

* `userId`
* IndexedDB synchronization flags;
* other internal application state.

Example:

```json
{
  "format": "finfast",
  "version": 1,
  "expenses": [
    {
      "expenseId": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 100.50,
      "categoryId": "food",
      "createdAt": "2026-08-28T10:30:00Z"
    }
  ]
}
```

`version` must be included so that future versions of the application can support older export files.

Current supported version is `1`.

### Excel

The Excel export is intended for human use.

Use CSV as the export format.

Description:

**"Для просмотра и работы с данными в Excel"**

CSV must contain only user-relevant information, such as:

* date;
* amount;
* category.

Do NOT include:

* `expenseId`;
* `userId`;
* synchronization state;
* other internal fields.

CSV is an export/viewing format and is not the canonical FinFast backup format.

## Import process

When importing JSON:

1. User clicks "Импорт" button
2. File selection dialog opens (filter: `.json` files only)
3. File is read and parsed
4. Full validation occurs:
   - JSON syntax check
   - Format check (`format: "finfast"`)
   - Version check (must be `1`)
   - Structure validation (expenses array with required fields)
   - Individual expense validation:
     - `expenseId`: must be valid UUID
     - `amount`: must be positive number
     - `categoryId`: optional string
     - `createdAt`: must be valid ISO date

5. Duplicate detection:
   - Load existing expenses for current user
   - Merge logic: identify by `expenseId + userId` pair
   - If exists: update the existing record and mark as requiring sync
   - If new: add as new record and mark as pending sync

6. Save merged expenses to IndexedDB
7. Refresh expense store
8. Show result message with count of added/updated expenses

**Important:** If validation fails at any step, NO data is imported (all-or-nothing approach).

## Import validation

The import service (`expenseImport.ts`) provides:

* `validateJson(content: string)` — full JSON structure and content validation;
* `mergeExpenses(existing, imported)` — intelligent merge with duplicate detection;
* `convertImportedExpenseToExpense()` — convert import format to internal Expense type.

All validation errors are descriptive and shown to the user in Russian.

---

# API conventions

Frontend API base URL:

```text
import.meta.env.VITE_API_BASE_URL
```

Default:

```text
http://localhost:8081
```

Main API resources:

```text
/auth/*
/expenses/*
```

Refer to the actual controllers and API service wrappers instead of assuming endpoint names or request formats.

When changing an endpoint:

1. update the backend controller;
2. update the service/business logic;
3. update the repository if necessary;
4. create a Flyway migration if the schema changes;
5. update the corresponding frontend API wrapper;
6. update affected Pinia stores/components.

---

# Development guidelines

Before changing existing architecture, inspect the relevant code and follow the patterns already used in the project.

Prefer small, focused changes.

Do not:

* introduce a new library when existing project dependencies can solve the problem;
* duplicate API calls across components;
* bypass the service layer;
* bypass backend authorization;
* store passwords in local storage or IndexedDB;
* silently discard local/pending data;
* change database schema without a Flyway migration;
* modify existing Flyway migrations that may already have been applied.

When implementing a new feature, first identify which layer owns the responsibility:

```text
UI/presentation       → Vue component
Application state     → Pinia store
REST communication    → API service
Business logic        → backend service
Persistence           → repository / IndexedDB
Database schema       → Flyway migration
```

Follow existing naming and folder conventions.

---

# Useful commands

From repository root:

```powershell
cd backend
.\gradlew.bat build
.\gradlew.bat bootRun
```

In another terminal:

```powershell
cd client
npm run dev
```

Frontend production build:

```powershell
cd client
npm run build
```

---

# Agent workflow

Before making changes:

1. Inspect the relevant existing implementation.
2. Identify the layer responsible for the requested behavior.
3. Follow existing patterns.
4. Make the smallest reasonable change.
5. Check for affected API contracts and synchronization behavior.
6. Build the affected part of the application.
7. Do not rewrite unrelated code.

When working on expenses, always consider:

* authenticated vs anonymous user;
* online vs offline state;
* local IndexedDB state;
* pending synchronization;
* `expenseId + userId` identity;
* duplicate prevention;
* logout/privacy behavior.

---

# Documentation

Do NOT create separate documentation files (`.md` files in the project root or folders).

If documentation or user instructions are needed:

1. Add them to this `AGENTS.md` file in a new section
2. Or embed comments/help text in the relevant Vue component or service
3. Do NOT create:
   - `IMPORT_EXPORT.md`
   - `README.md` for features
   - `IMPLEMENTATION_SUMMARY.md`
   - Other standalone `.md` files for documentation

Rationale:

* Centralized knowledge in one place (`AGENTS.md`)
* Easier to maintain consistency
* No scattered documentation files
* Single source of truth for development practices

