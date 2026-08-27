# Cloudflare Deployment Runbook

This runbook covers the first Cloudflare deployment for Feedback Hub.

## Current State

- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- Worker entry: `src/index.ts`
- D1 binding: `DB`
- Migration: `migrations/0001_initial.sql`

## Prerequisites

- Cloudflare account access
- Wrangler authentication or `CLOUDFLARE_API_TOKEN`
- A D1 database for Feedback Hub

## First Deployment

1. Create the D1 database.

```bash
npx wrangler d1 create feedback-hub
```

2. Copy the returned database ID into `wrangler.jsonc`.

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feedback-hub",
      "database_id": "YOUR_D1_DATABASE_ID"
    }
  ]
}
```

3. Apply the initial migration to the remote database.

```bash
npm run db:migrate:remote
```

4. Deploy the Worker.

```bash
npm run deploy
```

## Production Smoke Tests

Replace `WORKER_URL` with the deployed Worker URL.

```bash
curl "$WORKER_URL/health"
curl "$WORKER_URL/version"
curl "$WORKER_URL/contracts/status"
curl "$WORKER_URL/api/persistence/status"
curl -X POST "$WORKER_URL/api/persistence/roundtrip"
```

Expected results:

- `/health` returns `status: "ok"`.
- `/version` returns `appName: "feedback-hub"`.
- `/contracts/status` includes the persistence endpoints.
- `/api/persistence/status` returns `databaseBackedPersistenceReady: true`.
- `/api/persistence/roundtrip` returns `roundtripReady: true`.

## Browser Client Requirements

Browser clients can call the API directly. The Worker supports CORS preflight for:

- `GET`
- `POST`
- `OPTIONS`

Allowed request headers:

- `Content-Type`
- `X-Client-Id`
- `X-Workspace-Id`
- `X-User-Id`
- `X-Request-Id`
- `X-Correlation-Id`

## Validation Contract

Invalid request bodies return a stable error shape:

```json
{
  "status": "error",
  "errorCode": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "issues": []
}
```

This lets embedded app UIs and Platform Admin handle validation errors without parsing framework-specific response details.
