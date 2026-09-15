# Auditorium Booking Management System

An internal, production-quality Auditorium Booking Management System designed for authorized auditorium managers.

## System Architecture

```
auditorium/
├── shared/             # Shared TypeScript types, schemas, and domain constants
│   ├── src/
│   │   ├── constants/  # Session timings, booking statuses, event types
│   │   └── types/      # Shared interfaces (User, Booking, Session, etc.)
│   └── package.json
│
├── backend/            # Fastify + TypeScript backend
│   ├── src/
│   │   ├── config/     # Environment and app configuration
│   │   ├── routes/     # Fastify API route declarations
│   │   ├── controllers/# Request handlers and controllers
│   │   ├── services/   # Business logic layer
│   │   ├── db/         # Drizzle ORM schema & Neon PostgreSQL connection
│   │   ├── middleware/ # Authentication and validation middleware
│   │   ├── plugins/    # Fastify custom plugins
│   │   ├── types/      # Backend-specific types
│   │   └── server.ts   # Fastify application entry point
│   └── package.json
│
├── frontend/           # React + TypeScript + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # View pages
│   │   ├── layouts/    # Page layout wrappers
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility helpers and clients
│   │   ├── services/   # API service layer
│   │   ├── types/      # Frontend-specific types
│   │   ├── App.tsx     # Root application component
│   │   ├── main.tsx    # Application entry point
│   │   └── index.css   # Tailwind CSS & design tokens
│   └── package.json
│
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
└── package.json        # Monorepo workspace configuration
```

## Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
* **Backend**: Node.js (v20+), TypeScript, Fastify, Zod
* **Database & ORM**: Neon PostgreSQL, Drizzle ORM
* **Authentication**: Better Auth (Email & Password, internal users only)

## Auditorium Sessions

* **Morning**: 11:00 AM – 3:00 PM
* **Evening**: 5:00 PM – 9:00 PM

## Getting Started

### 1. Prerequisites
- Node.js (v20 or newer)
- npm (v9 or newer)
- Neon PostgreSQL database connection string

### 2. Installation
Install dependencies across all workspaces:
```bash
npm install
```

### 3. Environment Variables Configuration
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

**Required Backend Variables (`backend/.env`):**
- `PORT`: Backend server port (default: `5000`)
- `HOST`: Backend host (default: `0.0.0.0`)
- `NODE_ENV`: Environment (`development` / `production`)
- `DATABASE_URL`: Neon PostgreSQL connection string (`postgresql://...`)
- `BETTER_AUTH_SECRET`: Random 32+ character authentication secret
- `BETTER_AUTH_URL`: Backend server origin (e.g. `http://localhost:5000`)
- `CLIENT_ORIGIN`: Allowed frontend origin (e.g. `http://localhost:5173`)
- `DEV_USER_EMAIL`: Initial admin user email (for seed script)
- `DEV_USER_PASSWORD`: Initial admin password (for seed script)

**Optional Frontend Variables (`frontend/.env`):**
- `VITE_API_URL`: Custom API endpoint (default: `/api` in dev proxy, or `http://localhost:5000/api`)
- `VITE_AUTH_URL`: Custom Better Auth endpoint (default: derived from origin)

### 4. Database Setup & User Seed
```bash
# Push database schema to Neon PostgreSQL
npm run db:push

# Create initial authorized internal user (using DEV_USER_* credentials)
npm run auth:create-dev-user
```

### 5. Running in Development Mode
Start both frontend and backend concurrently:
```bash
npm run dev
```

Or run them in separate terminals:
```bash
# Backend on http://localhost:5000
npm run dev:backend

# Frontend on http://localhost:5173
npm run dev:frontend
```

### 6. Testing, Verification & Build
```bash
# Run full automated test suite (Booking Concurrency, Payment Concurrency, API Suite, Analytics)
npm test

# Type check all workspaces
npm run typecheck

# Build all workspaces for production
npm run build
```

### 7. Production User Provisioning (Operator Utility)
To provision authorized internal managers in the production database:
```bash
# 1. Run a dry run to validate production database connection and schema:
PROD_DATABASE_URL="<production connection string>" BETTER_AUTH_SECRET="<production secret>" npm run auth:provision-prod-users -- --dry-run

# 2. Run interactive live provisioning:
PROD_DATABASE_URL="<production connection string>" BETTER_AUTH_SECRET="<production secret>" BETTER_AUTH_URL="<production backend URL>" npm run auth:provision-prod-users
```
> [!NOTE]
> The utility requires `PROD_DATABASE_URL`, enforces a database guardrail check ensuring `current_database() === 'auditorium_production'`, masks password entry in the terminal, and never stores passwords in disk files or Git.

