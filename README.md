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
- Urgent notification candidates
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

## Contract Endpoints

- `GET /health`
- `GET /version`
- `GET /contracts/status`
- `GET /api/persistence/status`
- `POST /api/persistence/roundtrip`
- `POST /api/feedback/conversations`
- `POST /api/feedback/conversations/:conversationId/messages`
- `POST /api/feedback/conversations/:conversationId/analyze`
- `GET /api/feedback/issues`
- `GET /api/feedback/issues/:issueId`
- `POST /api/feedback/issues/:issueId/status`
- `GET /api/feedback/rankings/bugs`
- `GET /api/feedback/rankings/requests`
- `GET /api/feedback/rankings/questions`
- `GET /api/feedback/notifications/urgent`
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

See `docs/cloudflare-deployment.md` for the first-deploy runbook and production smoke tests.

## Platform Contract

See `professional-platform-contracts/docs/repositories/feedback-hub.md`.
