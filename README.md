# FinFast

FinFast is a personal expense tracker that helps users quickly record, manage and analyze their expenses.

## Features

* Add, edit and delete expenses
* Add expense amount, category, description and date
* Categorize expenses
* View expense history
* Expense statistics
* Offline-first support
* Synchronization with the backend
* Export and import of expenses
* PWA support

## Tech Stack

### Frontend

* Vue 3
* TypeScript
* Vuetify
* Pinia
* Vue Router
* Vite
* PWA

### Backend

* Kotlin
* Spring Boot
* Spring Data JPA / Hibernate
* Spring Security
* JWT
* Flyway
* PostgreSQL

### Build & Deployment

* Java 25
* GraalVM Native Image
* Gradle
* Docker
* GitHub Actions
* GitHub Container Registry
* GitHub Pages
* Render

### Database Hosting

* Supabase

## Architecture

```text
┌─────────────────────┐
│      Vue 3 PWA      │
│     GitHub Pages    │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│   Spring Boot API   │
│  GraalVM Native     │
│       Render        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     PostgreSQL      │
│      Supabase       │
└─────────────────────┘
```

## Development

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

The backend uses PostgreSQL for local development.

```bash
cd backend
./gradlew bootRun
```

Docker Compose can also be used to start the local database and backend.

## Production Deployment

Production deployments are triggered by pushing to the `production` branch.

```text
push → production
        │
        ├── Frontend
        │     └── Build → GitHub Pages
        │
        └── Backend
              └── Build Native Image → GHCR → Render
                                     
Database
   └── PostgreSQL → Supabase
```

GitHub Actions automatically builds and deploys both the frontend and backend.

## Project Structure

```text
FinFast/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   └── Dockerfile.native
├── client/
│   ├── src/
│   └── public/
└── .github/
    └── workflows/
```

## License

This project is for personal and educational purposes.
