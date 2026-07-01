# Le Comptoir - Beer Tap Management API

> Exercice technique HEINEKEN France · Digital Studio · Stack : Koa · PostgreSQL · TypeScript

Backend API for a bar tap management system. Tracks beer volume across 4 taps, handles pour operations, and manages keg stock.

Built with Koa, TypeScript, and PostgreSQL.

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- A `comptoir` database with a user that has read/write access

---

## Setup

```bash
cd <folder_name>
npm install
```

Copy `.env.example` to `.env` inside `backend/` and fill in your values:

```env
PG_URL=postgresql://<user>:<password>@localhost:5432/comptoir
PORT=3000
NODE_ENV="development"
```

Set `NODE_ENV="production"` when connecting to a live PostgreSQL instance — this enables SSL on the database connection (`rejectUnauthorized: false`).

---

## Running

```bash
# Development (watch mode)
npm run dev

# Production
npm run build
npm start
```

---

## API

All routes are prefixed with `/api`.

### Taps

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/taps` | List all 4 taps with current volume and status |
| `POST` | `/api/taps/:id/pour` | Pour a drink from a tap |
| `POST` | `/api/taps/:id/replace-keg` | Replace the keg on a tap, resetting volume to full |

#### `POST /api/taps/:id/pour`

Body:
```json
{ "pourSize": "half" }
```

`pourSize` must be `"half"` (250ml) or `"pint"` (500ml). Returns 400 for any other value.

Returns 409 if the tap has insufficient volume remaining. Note: a non-existent tap id also returns 409 (rather than 404) because both cases produce a 0-row result from the same guarded UPDATE query.

#### `POST /api/taps/:id/replace-keg`

No body required. Atomically decrements `kegs_stock` and resets the tap's `current_ml` to its `initial_ml`. Returns 409 if no keg stock is available, 404 if the tap id does not exist. The keg decrement is rolled back if the tap update fails.

---

### Kegs

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/kegs` | Current keg stock count and status. Returns 404 if not initialised |
| `POST` | `/api/kegs/restock` | Add to keg stock |

#### `POST /api/kegs/restock`

Body:
```json
{ "quantity": 10 }
```

`quantity` must be a whole number between 10 and 30 (inclusive). Increments both `current_stock` and `initial_stock`. Returns 404 if no `kegs_stock` row exists.

---

### Status values

All endpoints that return stock or volume include a computed `status` field:

| Value | Condition |
|-------|-----------|
| `"full"` | ≥ 50% remaining |
| `"low"` | 25–49% remaining |
| `"critical"` | > 0 but < 25% remaining |
| `"empty"` | 0 remaining |

---

## Testing

### First-time setup

Create the isolated test schema inside the existing `comptoir` database (requires the same DB credentials, no extra privileges needed):

```bash
npm run test:db:setup
```

This is idempotent — safe to re-run.

### Running tests

```bash
# Unit + integration
npm test

# Unit only (no database required)
npm run test:unit

# Integration only
npm run test:integration
```

### How isolation works

Integration tests run against a `comptoir_test` schema inside the same `comptoir` database, connected with `search_path=comptoir_test`. The production `public` schema is never touched. Each test resets and reseeds the schema via `beforeEach`, and test files run sequentially (`--runInBand`) to avoid concurrent writes.

Unit tests mock the `pg` pool entirely — no database connection required.

---

## Project structure

```
backend/
  src/
    controllers/    # Route handlers
    db/             # pg Pool setup
    routes/         # Router definitions
    types/          # Shared TypeScript types
    utils/          # Pure helpers (supplyStatus)
  test/
    unit/           # Mocked pool, tests controller logic in isolation
    integration/    # Real DB, tests full request/response against comptoir_test schema
      db/           # Schema SQL, test pool, reseed helper, provisioning script
```
