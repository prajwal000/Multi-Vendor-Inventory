# Inventory Sync API

A Node.js/TypeScript backend service that keeps product inventory in sync across multiple sales channels (Shopify + a mocked second channel). It exposes a REST API for managing vendors, products, and inventory, ingests Shopify webhooks, and propagates changes to other connected channels through a queue-based sync engine.

## Features

- REST API for vendors, products, and inventory records
- Shopify webhook ingestion with HMAC verification and idempotent processing
- Queue-based sync engine (BullMQ + Redis) with rate-limit-aware retries
- Conflict resolution when channels report differing stock for the same SKU
- Full audit trail of sync events (success, failure, retry, conflict) in Postgres
- JWT-protected endpoints for manual syncs and sync history
- Dockerized: API + Postgres + Redis via `docker-compose up`

## Current status

**Phase 1 — Foundation** is complete:

- TypeScript project with ESLint + Prettier
- Express server with `GET /health`
- Docker Compose: API + Postgres + Redis
- Prisma schema: `Vendor`, `Channel`, `Product`, `InventoryRecord`, `SyncLog`
- JWT auth (`POST /auth/login` against a seeded test user)

Webhook ingestion, the sync engine, conflict resolution, and the manual sync/history API are in progress.

## Tech stack

Node.js, TypeScript, Express, Prisma + PostgreSQL, BullMQ + Redis, Zod, Jest, Docker.

## Project structure

```
src/
  index.ts              # server entry point
  app.ts                # express app + middleware wiring
  routes/                # route handlers (health, auth, ...)
  middleware/             # auth, error handling
  lib/                   # env config, prisma client
prisma/
  schema.prisma          # Vendor, Channel, Product, InventoryRecord, SyncLog
```

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

## Environment variables

See [`.env.example`](.env.example) for the full list (database/redis URLs, JWT secret, seeded test user credentials).

## API

### `GET /health`

Returns `{ status: "ok", timestamp }`.

### `POST /auth/login`

Log in with the seeded test user (defaults below, configurable via `.env`):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

Returns `{ token }`. Use it as a `Bearer` token on protected routes.

## Testing

```bash
npm test
```

## License

UNLICENSED — personal/portfolio project.
