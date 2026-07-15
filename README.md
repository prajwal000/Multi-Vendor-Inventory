# Inventory Sync API

A Node.js/TypeScript backend that keeps product inventory in sync across multiple sales channels (Shopify + a mocked second channel). See the full build plan in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## Status

**Phase 1 — Foundation** is complete:

- TypeScript project with ESLint + Prettier
- Express server with `GET /health`
- Docker Compose: API + Postgres + Redis
- Prisma schema: `Vendor`, `Channel`, `Product`, `InventoryRecord`, `SyncLog`
- JWT auth (`POST /auth/login` against a seeded test user)

## Getting started

### Local (without Docker)

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

### Docker Compose (API + Postgres + Redis)

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`. Check `GET /health`.

### Auth

Log in with the seeded test user (configurable via `.env`, defaults below):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

Use the returned `token` as a `Bearer` token on protected routes.

## Tech stack

Node.js, TypeScript, Express, Prisma + PostgreSQL, BullMQ + Redis (upcoming), Zod, Jest, Docker.
