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
- AI Platform Core deployed and reachable

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

3. Confirm the AI Platform Core binding or base URL.

`wrangler.jsonc` prefers the Worker service binding:

```jsonc
{
  "services": [
    {
      "binding": "AI_PLATFORM_CORE_SERVICE",
      "service": "ai-platform-core"
    }
  ]
}
```

If service binding is not available, set `AI_PLATFORM_CORE_BASE_URL` instead. Use `AI_PLATFORM_CORE_TOKEN` only when AI Platform Core requires a bearer token.

4. Apply the initial migration to the remote database.

```bash
npm run db:migrate:remote
```

5. Deploy the Worker.

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
curl "$WORKER_URL/api/feedback/conversations?limit=10"
curl "$WORKER_URL/api/feedback/conversations/YOUR_CONVERSATION_ID"
curl "$WORKER_URL/api/feedback/issues?status=open&severity=Critical&limit=10"
curl "$WORKER_URL/api/feedback/notifications/urgent"
curl "$WORKER_URL/api/admin/inbox?limit=10"
curl "$WORKER_URL/api/admin/issue-summary"
curl -X POST "$WORKER_URL/api/feedback/conversations/YOUR_CONVERSATION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"closed"}'
curl -X POST "$WORKER_URL/api/feedback/intake" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "numeria-studio",
    "appName": "Numeria Studio",
    "workspaceId": "smoke_workspace",
    "userId": "smoke_user",
    "route": "/app/sessions",
    "screenName": "鑑定セッション",
    "appVersion": "0.1.0",
    "device": "smoke",
    "browser": "smoke",
    "initialMessage": "保存できない。登録してもデータが残らない"
  }'
```

Expected results:

- `/health` returns `status: "success"`.
- `/version` returns `appName: "feedback-hub"`.
- `/contracts/status` includes the persistence and feedback intake endpoints.
- `/api/persistence/status` returns `databaseBackedPersistenceReady: true`.
- `/api/persistence/roundtrip` returns `roundtripReady: true`.
- `/api/persistence/roundtrip` should return `analysisSource: "ai-platform-core"` when AI Platform Core is reachable.
- `/api/feedback/conversations?limit=10` returns recent conversations for the admin list.
- `/api/feedback/conversations/YOUR_CONVERSATION_ID` returns the raw messages, AI analyses, and `issueLinks` to inspect the canonical Issue mapping.
- `/api/feedback/issues?status=open&severity=Critical&limit=10` returns filtered issues for the admin list.
- `/api/feedback/notifications/urgent` returns `urgencyReasons` for each notification candidate.
- `/api/admin/inbox?limit=10` returns recent conversations enriched with the latest message, AI analysis, and Issue link.
- `/api/admin/issue-summary` returns issue breakdowns by category, status, severity, and impact.
- `/api/feedback/conversations/YOUR_CONVERSATION_ID/status` returns a conversation status transition event.
- `/api/feedback/intake` returns `intake.status: "accepted"` and either `intake.nextAction: "ask_follow_up"` or `intake.nextAction: "show_received"`.

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
