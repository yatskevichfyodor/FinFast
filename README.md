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

#### HTTPS on a local network (mobile testing)

Use this setup to open the development app on a phone connected to the same Wi-Fi network. Replace `192.168.0.234` below with the computer's current LAN IP address, and keep it consistent in the certificate, client environment, and service CORS settings.

Generate a certificate for that IP with [mkcert](https://github.com/FiloSottile/mkcert). From the repository root, run:

```powershell
cd certs
mkcert -install
mkcert -cert-file finfast.pem -key-file finfast-key.pem 192.168.0.234
```

`mkcert -install` installs the local CA on the development computer. To avoid browser certificate warnings on the phone, install the CA certificate (`rootCA.pem` from `mkcert -CAROOT`) on the phone and trust it. Do not copy or share `rootCA-key.pem`.

Start PostgreSQL and Kafka (if they are not already running) in a separate terminal from the repository root:

```powershell
cd docker
docker volume create finfast_postgres-data
docker compose -f docker-compose.dev.yml up db kafka kafka-init
```

Then start each service in its own terminal from the repository root:

```powershell
cd services/auth-service
.\gradlew.bat quarkusDev -Dquarkus.profile=dev-https
```

Auth Service HTTPS: `https://192.168.0.234:8443`.

```powershell
cd services/expense-service
.\gradlew.bat bootRun --args="--spring.profiles.active=dev-https"
```

Expense Service HTTPS: `https://192.168.0.234:8333`.

Start the Vite development server in another terminal from the repository root:

```powershell
cd client
npm run dev -- --config vite.development-https.config.ts --mode development-https
```

Open `https://192.168.0.234:5273/finfast/` on the phone. The phone and development computer must be on the same network, and the computer's firewall must allow inbound traffic on ports `5273`, `8333`, and `8443`. If using another IP, update it in `client/.env.development-https`, `services/auth-service/src/main/resources/application-dev-https.yml`, and the Expense Service `finfast.clientUrls` CORS setting (currently in `services/expense-service/src/main/resources/application-dev.yml`) as well as regenerating the certificate.

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
