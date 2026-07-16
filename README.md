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

**Phase 1 — Foundation** and **Phase 2 — Core CRUD API** are complete:

- TypeScript project with ESLint + Prettier
- Express server with `GET /health`
- Docker Compose: API + Postgres + Redis
- Prisma schema: `Vendor`, `Channel`, `Product`, `InventoryRecord`, `SyncLog`
- JWT auth (`POST /auth/login` against a seeded test user)
- CRUD endpoints for vendors, channels, and products; inventory lookup by SKU
- Request validation with Zod, consistent JSON error shape
- Interactive API docs via Swagger UI at `/docs`
- Seed script with sample vendors/channels/products

Webhook ingestion, the sync engine, conflict resolution, and the manual sync/history API are in progress.

## Tech stack

Node.js, TypeScript, Express, Prisma + PostgreSQL, BullMQ + Redis, Zod, Jest, Docker.

## Project structure

```
src/
  index.ts              # server entry point
  app.ts                # express app + middleware wiring
  routes/                # route handlers (health, auth, vendors, channels, products, inventory)
  middleware/             # auth, validation, error handling
  lib/                   # env config, prisma client, async handler, swagger spec
prisma/
  schema.prisma          # Vendor, Channel, Product, InventoryRecord, SyncLog
  seed.ts                # sample vendors/channels/products
```

## Getting started

### Local (without Docker)

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run prisma:seed
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

Full interactive docs (Swagger UI) are available at `http://localhost:3000/docs` once the server is running.

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

### Vendors

- `GET /vendors` — list vendors
- `POST /vendors` — create a vendor (`{ name }`)

### Channels

- `GET /channels` — list channels
- `POST /channels` — create a channel (`{ name, type, rateLimitPerSec?, isSourceOfTruth? }`)

### Products

- `GET /products` — list products (includes vendor)
- `POST /products` — create a product (`{ sku, title, vendorId }`)

### Inventory

- `GET /inventory/:sku` — inventory levels for a SKU across all channels

## Testing

```bash
npm test
```

## License

UNLICENSED — personal/portfolio project.
