# Feedback Hub

Feedback Hub is the user-voice intelligence system for the professional platform.

It receives questions, bugs, UX feedback, improvements, and feature requests from shared UI entry points embedded in apps such as Numeria Studio, Velvet, SNS Planner, and Communication Planner.

The goal is not development management. The goal is to preserve raw user voice, ask AI Platform Core to analyze it, group similar feedback into canonical issues, and rank product improvements by severity, count, and impact.

## MVP Scope

- Shared feedback conversation intake
- Message persistence
- AI analysis through AI Platform Core
- Similar issue grouping
- Priority score calculation
- Bug, request, and question rankings
- Urgent notification candidates with reason codes
- Cloudflare Workers runtime
- Cloudflare D1 persistence

## Core Model

```text
Conversation -> Message -> AI Analysis -> Issue
```

Conversation and Message preserve the original user voice. AI Analysis interprets the conversation. Issue is the canonical improvement unit that groups similar feedback.

## AI Platform

Feedback Hub does not own model execution. AI analysis is delegated to AI Platform Core by service binding or base URL.

- Preferred: `AI_PLATFORM_CORE_SERVICE`
- Fallback: `AI_PLATFORM_CORE_BASE_URL`
- Optional secret: `AI_PLATFORM_CORE_TOKEN`

The deterministic classifier is fallback-only for local development, tests, and APC outages.

## Embedded Question Box Contract

Each source app owns its own question box UI. Feedback Hub owns the shared intake API and AI processing.

- Source apps render `質問・改善` and the chat UI in their own product experience.
- Source apps attach `appId`, `appName`, `workspaceId`, `userId`, route, screen, version, device, browser, and occurrence time.
- Feedback Hub receives the feedback, stores the original voice, uses AI Platform Core, groups similar feedback into Issues, and ranks priority.

Embedding endpoints:

- `GET /api/embed/config?appId=...`
- `POST /api/embed/feedback`
- `GET /api/embed/conversations/:conversationId`
- `POST /api/embed/conversations/:conversationId/messages`

See `docs/embedding.md` for the app-side integration contract.

## Contract Endpoints

- `GET /health`
- `GET /version`
- `GET /contracts/status`
- `GET /api/persistence/status`
- `POST /api/persistence/roundtrip`
- `GET /api/embed/config`
  - Returns the source-app-owned question box contract for an `appId`.
- `POST /api/embed/feedback`
  - Receives feedback from each app's own question box UI and runs the same intake flow as `/api/feedback/intake`.
- `GET /api/embed/conversations/:conversationId`
  - Returns an app-friendly conversation view with messages, latest AI analysis, canonical Issue, and next UI action.
- `POST /api/embed/conversations/:conversationId/messages`
  - Receives follow-up answers from each app's question box UI, stores them as user messages, and re-runs AI analysis.
- `POST /api/feedback/intake`
- `GET /api/feedback/conversations`
- `POST /api/feedback/conversations`
- `GET /api/feedback/conversations/:conversationId`
  - Returns the raw conversation, messages, AI analyses, and `issueLinks` to inspect which canonical Issue the feedback was merged into.
- `GET /api/feedback/conversations/:conversationId/follow-ups`
  - Returns the latest AI-suggested follow-up questions for a conversation.
- `POST /api/feedback/conversations/:conversationId/messages`
- `POST /api/feedback/conversations/:conversationId/analyze`
- `POST /api/feedback/conversations/:conversationId/status`
- `GET /api/feedback/issues`
- `GET /api/feedback/issues/:issueId`
  - Returns the canonical Issue, issue links, source conversation previews, and status history so admins can inspect the original user voice behind an AI summary.
- `GET /api/feedback/issues/:issueId/source-messages`
  - Returns the original messages linked to a canonical Issue, preserving the user voice behind AI summaries.
- `POST /api/feedback/issues/:issueId/status`
- `GET /api/feedback/rankings/bugs`
- `GET /api/feedback/rankings/requests`
- `GET /api/feedback/rankings/questions`
- `GET /api/feedback/notifications/urgent`
- `GET /api/feedback/notifications/urgent/summary`
  - Returns urgent notification totals, reason counts, and top priority score for admin badges and alert routing.
- `GET /api/admin/action-board`
  - Returns prioritized Issues with urgency reasons, recommended admin actions, and action reason codes.
- `GET /api/admin/follow-up-queue`
  - Returns open conversations where the latest AI analysis suggested follow-up questions.
- `GET /api/admin/inbox`
  - Returns recent conversations enriched with the latest message, latest AI analysis, and latest canonical Issue link for admin screens.
- `GET /api/admin/intake-metrics`
  - Returns intake totals, AI analysis totals, Issue totals, urgent Issue totals, app breakdowns, and category breakdowns for admin summary cards.
- `GET /api/admin/issue-briefs`
  - Returns development-ready Issue briefs with priority context, representative source feedback, urgency reasons, and recommended admin actions.
- `GET /api/admin/metadata-quality`
  - Returns metadata completeness for automatically collected conversation context such as app version, route, screen, device, browser, and occurred time.
- `GET /api/admin/rankings`
  - Returns Bug TOP10, request TOP20, and question TOP20 rankings for admin dashboard sections.
- `GET /api/admin/status-activity`
  - Returns recent Issue status transitions enriched with canonical Issue context for admin activity views.
- `GET /api/admin/issue-summary`
- `GET /api/admin/triage-queue`
  - Returns open or triaged Issues sorted by priority with source conversation counts and the latest user-message preview.
- `GET /api/admin/overview`

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

For local Cloudflare D1 work:

```bash
npm run db:migrate:local
npm run dev
```

For Cloudflare deployment:

```bash
npx wrangler d1 create feedback-hub
npm run db:migrate:remote
npm run deploy
```

GitHub Actions production deployment is available through the `Cloudflare Production` workflow. Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`

See `docs/cloudflare-deployment.md` for the first-deploy runbook and production smoke tests.

Issue list filters: `category`, `status`, `severity`, `impact`, `minCount`, and `limit`.

Issue source message filters: `limit`.

Conversation follow-up filters: `limit`.

Admin follow-up queue filters: `workspaceId`, `appId`, and `limit`.

Admin inbox filters: `workspaceId`, `appId`, `status`, `category`, `severity`, `impact`, and `limit`.

Admin intake metrics filters: `workspaceId`, `appId`, and `since`.

Admin issue brief filters: `category`, `status`, and `limit`.

Admin metadata quality filters: `workspaceId`, `appId`, and `since`.

Admin action board filters: `status` and `limit`.

Feedback ranking filters: `status` and `limit`.

Admin ranking filters: `status`, `bugLimit`, `requestLimit`, and `questionLimit`.

Admin status activity filters: `issueId`, `nextStatus`, `since`, and `limit`.

Admin triage queue filters: `category`, `status`, `severity`, `impact`, `minCount`, and `limit`.

Embed config filters: `appId`.

## Platform Contract

See `professional-platform-contracts/docs/repositories/feedback-hub.md`.
