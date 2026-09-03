# Cloudflare Deployment Runbook

This runbook covers the first Cloudflare deployment for Feedback Hub.

## Current State

- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- Worker entry: `src/index.ts`
- D1 binding: `DB`
- Migrations:
  - `migrations/0001_initial.sql`
  - `migrations/0002_release_intake_context.sql`

## Prerequisites

- Cloudflare account access
- Wrangler authentication or `CLOUDFLARE_API_TOKEN`
- A D1 database for Feedback Hub
- AI Platform Core deployed and reachable
- GitHub repository secrets for production deploy:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_D1_DATABASE_ID`

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

5. Apply the release intake context migration.

```bash
npm run db:migrate:remote:release-intake-context
```

This step adds `sourceApp`, `planId`, `currentScreen`, submitted category, and `correlationId` columns. The package script is safe to run again if the release columns are already present.

6. Deploy the Worker.

```bash
npm run deploy
```

## GitHub Actions Deployment

Use this path when deploying from the GitHub web UI.

1. Create the D1 database in Cloudflare.

```bash
npx wrangler d1 create feedback-hub
```

2. Add the returned database ID to GitHub repository secrets as `CLOUDFLARE_D1_DATABASE_ID`.
3. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to GitHub repository secrets.
4. Open GitHub Actions.
5. Select `Cloudflare Production`.
6. Run workflow from `main`.

The workflow runs typecheck, tests, build, injects the D1 database ID into `wrangler.jsonc`, applies the remote D1 migrations, and deploys the Worker.

## Production Smoke Tests

Replace `WORKER_URL` with the deployed Worker URL.

```bash
curl "$WORKER_URL/health"
curl "$WORKER_URL/version"
curl "$WORKER_URL/contracts/status"
curl "$WORKER_URL/api/persistence/status"
curl -X POST "$WORKER_URL/api/persistence/roundtrip"
curl "$WORKER_URL/api/embed/config?appId=numeria-studio"
curl "$WORKER_URL/api/embed/conversations/YOUR_CONVERSATION_ID"
curl "$WORKER_URL/api/feedback/conversations?limit=10"
curl "$WORKER_URL/api/feedback/conversations/YOUR_CONVERSATION_ID"
curl "$WORKER_URL/api/feedback/conversations/YOUR_CONVERSATION_ID/follow-ups?limit=5"
curl "$WORKER_URL/api/feedback/issues?status=open&severity=Critical&limit=10"
curl "$WORKER_URL/api/feedback/issues/YOUR_ISSUE_ID"
curl "$WORKER_URL/api/feedback/issues/YOUR_ISSUE_ID/source-messages?limit=50"
curl "$WORKER_URL/api/feedback/notifications/urgent"
curl "$WORKER_URL/api/feedback/notifications/urgent/summary"
curl "$WORKER_URL/api/admin/action-board?limit=10"
curl "$WORKER_URL/api/admin/app-summary?limit=10"
curl "$WORKER_URL/api/admin/follow-up-queue?limit=10"
curl "$WORKER_URL/api/admin/inbox?limit=10"
curl "$WORKER_URL/api/admin/inbox?severity=Critical&impact=Critical&limit=10"
curl "$WORKER_URL/api/admin/intake-metrics?sourceApp=numeria-studio&planId=free"
curl "$WORKER_URL/api/admin/intake-metrics"
curl "$WORKER_URL/api/admin/issue-briefs?limit=10"
curl "$WORKER_URL/api/admin/metadata-quality"
curl "$WORKER_URL/api/admin/rankings"
curl "$WORKER_URL/api/admin/release-readiness"
curl "$WORKER_URL/api/admin/status-activity?limit=10"
curl "$WORKER_URL/api/admin/issue-summary"
curl "$WORKER_URL/api/admin/triage-queue?limit=10"
curl -X POST "$WORKER_URL/api/feedback/conversations/YOUR_CONVERSATION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"closed"}'
curl -X POST "$WORKER_URL/api/feedback/intake" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "numeria-studio",
    "sourceApp": "numeria-studio",
    "appName": "Numeria Studio",
    "planId": "free",
    "workspaceId": "smoke_workspace",
    "userId": "smoke_user",
    "route": "/app/sessions",
    "screenName": "鑑定セッション",
    "currentScreen": "鑑定セッション",
    "category": "Bug",
    "appVersion": "0.1.0",
    "device": "smoke",
    "browser": "smoke",
    "occurredAt": "2026-09-03T00:00:00.000Z",
    "correlationId": "smoke_feedback_numeria_free_001",
    "initialMessage": "保存できない。登録してもデータが残らない"
  }'
curl -X POST "$WORKER_URL/api/embed/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "velvet",
    "sourceApp": "velvet",
    "appName": "Velvet",
    "planId": "pro",
    "workspaceId": "smoke_workspace",
    "userId": "smoke_user",
    "route": "/app/chat",
    "screenName": "会話画面",
    "currentScreen": "会話画面",
    "category": "Bug",
    "appVersion": "0.1.0",
    "device": "smoke",
    "browser": "smoke",
    "occurredAt": "2026-09-03T00:00:00.000Z",
    "correlationId": "smoke_feedback_velvet_pro_001",
    "initialMessage": "Proにアップグレードしたのに反映されません"
  }'
curl -X POST "$WORKER_URL/api/embed/conversations/YOUR_CONVERSATION_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "会話画面で送信した直後に止まりました"
  }'
```

Expected results:

- `/health` returns `status: "success"`.
- `/version` returns `appName: "feedback-hub"`.
- `/contracts/status` includes the persistence and feedback intake endpoints.
- `/api/persistence/status` returns `databaseBackedPersistenceReady: true`.
- `/api/persistence/roundtrip` returns `roundtripReady: true`.
- `/api/persistence/roundtrip` should return `analysisSource: "ai-platform-core"` when AI Platform Core is reachable.
- `/api/embed/config?appId=numeria-studio` returns `entryLabel: "質問・改善"`, `uiOwner: "source-app"`, `processingOwner: "feedback-hub"`, and `aiProvider: "ai-platform-core"`.
- `/api/embed/conversations/YOUR_CONVERSATION_ID` returns an app-friendly conversation view with messages, latest analysis, linked Issue, and next action.
- `/api/feedback/conversations?limit=10` returns recent conversations for the admin list.
- `/api/feedback/conversations/YOUR_CONVERSATION_ID` returns the raw messages, AI analyses, and `issueLinks` to inspect the canonical Issue mapping.
- `/api/feedback/conversations/YOUR_CONVERSATION_ID/follow-ups?limit=5` returns the latest AI-suggested follow-up questions.
- `/api/feedback/issues?status=open&severity=Critical&limit=10` returns filtered issues for the admin list.
- `/api/feedback/issues/YOUR_ISSUE_ID` returns the canonical Issue, issue links, `sourceConversations`, and status history.
- `/api/feedback/issues/YOUR_ISSUE_ID/source-messages?limit=50` returns original messages linked to the canonical Issue.
- `/api/feedback/notifications/urgent` returns `urgencyReasons` for each notification candidate.
- `/api/feedback/notifications/urgent/summary` returns urgent totals, reason counts, and top priority score.
- `/api/admin/action-board?limit=10` returns prioritized Issues with urgency reasons, recommended admin actions, and action reason codes.
- `/api/admin/app-summary?limit=10` returns per-source-app intake health, urgent Issue totals, follow-up demand, and embed config for connected apps.
- `/api/admin/follow-up-queue?limit=10` returns open conversations with AI-suggested follow-up questions.
- `/api/admin/inbox?limit=10` returns recent conversations enriched with the latest message, AI analysis, and Issue link.
- `/api/admin/inbox?severity=Critical&impact=Critical&limit=10` returns admin inbox items narrowed to high-priority AI analysis results.
- `/api/admin/intake-metrics` returns intake, analysis, issue, urgent issue, app, and category totals for admin summary cards.
- `/api/admin/intake-metrics?sourceApp=numeria-studio&planId=free` returns source-app and plan scoped totals.
- `/api/admin/issue-briefs?limit=10` returns development-ready Issue briefs with priority context and representative source feedback.
- `/api/admin/metadata-quality` returns metadata completeness for automatically collected conversation context.
- `/api/admin/rankings` returns Bug TOP10, request TOP20, and question TOP20 sections.
- `/api/admin/release-readiness` returns Numeria Studio and Velvet Free / Pro readiness checks for AI Platform Core configuration, release intake columns, required context, redaction, urgent notifications, and grouping safeguards.
- `/api/admin/status-activity?limit=10` returns recent Issue status transitions with canonical Issue context.
- `/api/admin/issue-summary` returns issue breakdowns by category, status, severity, and impact.
- `/api/admin/triage-queue?limit=10` returns open Issues sorted by priority with source conversation counts and latest user-message previews.
- `/api/feedback/conversations/YOUR_CONVERSATION_ID/status` returns a conversation status transition event.
- `/api/feedback/intake` returns `intake.status: "accepted"` and either `intake.nextAction: "ask_follow_up"` or `intake.nextAction: "show_received"`.
- `/api/embed/feedback` returns the same accepted intake shape for source-app-owned question box UIs.
- `/api/embed/conversations/YOUR_CONVERSATION_ID/messages` stores a follow-up answer from the source app UI and re-runs analysis.

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
- `X-Source-App`
- `X-Plan-Id`

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
