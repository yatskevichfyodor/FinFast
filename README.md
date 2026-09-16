# FinFast

FinFast is a personal expense tracker that helps users quickly record, manage and analyze their expenses.

## Features

* Add, edit and delete expenses
* Add expense amount, category, description and date
* Categorize expenses
* View expense history
* Expense statistics
* Offline-first support with IndexedDB
* Automatic synchronization with the backend
* Export and import of expenses (JSON for backup, CSV for Excel)
* PWA support (installable as desktop/mobile app)
* Anonymous mode (use without account)
* Google OAuth 2.0 authentication
* Event-driven architecture with Kafka

## Tech Stack

### Frontend

* Vue 3
* TypeScript
* Vuetify
* Pinia
* Vue Router
* Vite
* PWA
* IndexedDB (offline storage)

### Backend

**Auth Service**
* Kotlin
* Quarkus
* Hibernate ORM
* Flyway
* JWT
* Google OAuth 2.0
* Kafka (event publishing)
* PostgreSQL

**Expense Service**
* Kotlin
* Spring Boot
* Spring Data JPA / Hibernate
* Spring Security
* Spring Kafka
* JWT validation
* Flyway
* PostgreSQL

### Messaging

* Apache Kafka
* Event-driven architecture for inter-service communication
* User events topic for authentication updates
* Production Kafka hosted on Aiven.io

### Build & Deployment

* Java 25
* GraalVM Native Image
* Gradle
* Docker
* GitHub Actions
* GitHub Container Registry
* GitHub Pages
* Render

## Architecture

```text
┌─────────────────────┐
│      Vue 3 PWA      │
│     GitHub Pages    │
└──────────┬──────────┘
           │
           ├──────────────────────────┐
           │ HTTPS                    │ HTTPS + header Authorization: Bearer <jwt access_token>
           │ get refresh              │
           │ and access token         │
           ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐
│   Auth Service      │   │  Expense Service    │
│   Quarkus / Native  │   │  Spring Boot /      │
│   Render            │   │  GraalVM Native     │
└──────────┬──────────┘   └──────────┬──────────┘
           │                         │
           │─────────────────────────│
           │                         │
           ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│     PostgreSQL      │   │   Apache Kafka     │
│      Supabase       │   │     Aiven.io        │
└─────────────────────┘   └─────────────────────┘
```

The application uses a microservices architecture:

* **Auth Service** - Handles authentication, JWT token generation, and user management
* **Expense Service** - Manages expense CRUD operations and business logic, validates JWT tokens
* **Kafka** - Event-driven communication between services (user events, authentication updates)
* **PostgreSQL** - Shared database for both services

**Communication Flow:**
- Client communicates with Auth Service via HTTPS (authentication, token generation)
- Client communicates with Expense Service via HTTPS using `Authorization: Bearer <jwt access_token>` header
- Auth Service communicates with PostgreSQL database
- Expense Service communicates with PostgreSQL database
- Auth Service publishes events to Kafka
- Expense Service publishes/consumes events from Kafka

## Development

### Frontend

```bash
cd client
npm install
npm run dev
```

Default Vite development server:

```text
http://localhost:5173
```

### Backend Services

The project uses a microservices architecture with two backend services.

#### Using Docker Compose (Recommended)

Docker Compose starts all services including PostgreSQL and Kafka:

```bash
cd docker
docker compose -f docker-compose.dev.yml up
```

This will start:
* PostgreSQL database (port 5432)
* Apache Kafka (port 9094)
* Auth Service (port 8082)
* Expense Service (port 8081)

#### Running Services Individually

**Auth Service (Quarkus)**

```bash
cd services/auth-service
./gradlew quarkusDev
```

**Expense Service (Spring Boot)**

```bash
cd services/expense-service
./gradlew bootRun
```

Default ports:
* Auth Service: `http://localhost:8082`
* Expense Service: `http://localhost:8081`

## Production Deployment

Production deployments are triggered by pushing to the `production` branch.

```text
push → production
        │
        ├── Frontend
        │     └── Build → GitHub Pages
        │
        ├── Auth Service
        │     └── Build Native Image → GHCR → Render
        │
        └── Expense Service
              └── Build Native Image → GHCR → Render

Infrastructure
   ├── PostgreSQL → Supabase
   └── Kafka → Aiven
```

GitHub Actions automatically builds and deploys all services:

* **Frontend** - Built and deployed to GitHub Pages
* **Auth Service** - Built as GraalVM native image, pushed to GHCR, deployed to Render
* **Expense Service** - Built as GraalVM native image, pushed to GHCR, deployed to Render

### Production Infrastructure

* **Database** - PostgreSQL hosted on Supabase.com
* **Message Broker** - Apache Kafka hosted on Aiven.io with SASL_SSL authentication
* **Application Hosting** - Render.com (for backend services)
* **Static Hosting** - GitHub Pages (for frontend)
* **Container Registry** - GitHub Container Registry (GHCR)

## Project Structure

```text
FinFast/
├── client/                          # Vue 3 frontend application
│   ├── src/
│   │   ├── components/             # Vue components
│   │   ├── views/                  # Page views
│   │   ├── services/               # API service layer
│   │   └── stores/                 # Pinia state management
│   ├── public/
│   └── package.json
├── services/                       # Backend microservices
│   ├── auth-service/               # Quarkus authentication service
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── kotlin/         # Kotlin source code
│   │   │       └── resources/      # Configuration files
│   │   ├── Dockerfile
│   │   ├── Dockerfile.native
│   │   └── build.gradle.kts
│   └── expense-service/            # Spring Boot expense service
│       ├── src/
│       │   └── main/
│       │       ├── kotlin/         # Kotlin source code
│       │       └── resources/      # Configuration files
│       ├── Dockerfile
│       ├── Dockerfile.native
│       └── build.gradle.kts
├── docker/                         # Docker Compose configurations
│   ├── docker-compose.dev.yml      # Local development setup
│   ├── docker-compose.dev.native.yml
│   └── kafka/                      # Kafka configuration files
├── .github/
│   └── workflows/                  # CI/CD pipelines
│       ├── deploy.yml              # Backend deployment
│       └── pages.yml               # Frontend deployment
└── AGENTS.md                       # Development guidelines for AI agents
```

## License

This project is for personal and educational purposes.
