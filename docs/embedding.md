# Feedback Hub Embedding Guide

This guide defines how source apps such as Numeria Studio, Velvet, SNS Planner, Communication Planner, and Growth Engine connect their own question box UI to Feedback Hub.

## Responsibility Split

Source apps own the visible UI. Feedback Hub owns intake, AI understanding, grouping, ranking, and admin review.

| Area | Owner |
| --- | --- |
| `質問・改善` button | Source app |
| Chat UI | Source app |
| Route, screen, version, device, browser context | Source app |
| Feedback intake API | Feedback Hub |
| AI analysis | Feedback Hub through AI Platform Core |
| Similar feedback grouping | Feedback Hub |
| Priority and impact ranking | Feedback Hub |
| Admin dashboard | Feedback Hub |

## Supported Source Apps

| appId | appName | Knowledge scope |
| --- | --- | --- |
| `numeria-studio` | `Numeria Studio` | `numeria-studio` |
| `velvet` | `Velvet` | `velvet` |
| `sns-planner` | `SNS Planner` | `sns-planner` |
| `communication-planner` | `Communication Planner` | `communication-planner` |
| `growth-engine` | `Growth Engine` | `growth-engine` |

Unknown future `appId` values receive a generic config so new apps can start integration before a formal app registry update.

## Get App Config

```http
GET /api/embed/config?appId=numeria-studio
```

The response tells the source app which label, endpoint, fields, and ownership model to use.

```json
{
  "status": "success",
  "config": {
    "appId": "numeria-studio",
    "appName": "Numeria Studio",
    "knowledgeScope": "numeria-studio",
    "entryLabel": "質問・改善",
    "uiOwner": "source-app",
    "processingOwner": "feedback-hub",
    "aiProvider": "ai-platform-core",
    "intakeEndpoint": "/api/embed/feedback",
    "followUpEndpointTemplate": "/api/embed/conversations/{conversationId}/messages",
    "compatibleIntakeEndpoint": "/api/feedback/intake",
    "requiredFields": ["appId", "appName", "workspaceId", "userId", "initialMessage"],
    "autoContextFields": ["route", "screenName", "appVersion", "device", "browser", "occurredAt"],
    "conversationModel": ["Conversation", "Message", "AI Analysis", "Issue"],
    "supportedCategories": ["Question", "Bug", "Improvement", "Feature Request", "UX Feedback", "Other"],
    "responseModes": ["show_received", "ask_follow_up"],
    "rawVoicePreserved": true
  }
}
```

## Send Feedback

```http
POST /api/embed/feedback
Content-Type: application/json
```

```json
{
  "appId": "numeria-studio",
  "appName": "Numeria Studio",
  "workspaceId": "ws_123",
  "userId": "user_456",
  "initialMessage": "保存できません",
  "route": "/sessions/abc",
  "screenName": "鑑定詳細",
  "appVersion": "0.1.0",
  "device": "mobile",
  "browser": "Safari",
  "occurredAt": "2026-08-31T00:00:00.000Z"
}
```

`POST /api/embed/feedback` uses the same backend flow as `POST /api/feedback/intake`. It creates a Conversation, stores the first Message, asks AI Platform Core for analysis, links or creates an Issue, and returns the intake decision.

## Minimal Client Flow

1. Source app renders a `質問・改善` button.
2. When opened, source app collects the user's first message.
3. Source app attaches workspace, user, route, screen, version, device, browser, and time context.
4. Source app posts to `/api/embed/feedback`.
5. If Feedback Hub returns `intake.nextAction: "ask_follow_up"`, show the returned `followUpQuestions`.
6. If the user answers a follow-up question, post that answer to `/api/embed/conversations/{conversationId}/messages`.
7. Otherwise show a received state.

## Send Follow-Up Answers

```http
POST /api/embed/conversations/{conversationId}/messages
Content-Type: application/json
```

```json
{
  "body": "鑑定詳細画面で保存ボタンを押した後に発生しました"
}
```

The endpoint stores the answer as a user Message, asks AI Platform Core to analyze the updated Conversation, and returns the same accepted intake shape as the first submission.

## Response Handling

Successful intake returns `201`.

Important response fields:

- `conversationId`: Save temporarily in the source app UI if follow-up messages are added later.
- `issue`: Canonical Issue linked or created from the feedback.
- `analysis`: AI understanding result from AI Platform Core or fallback.
- `analysisSource`: Expected to be `ai-platform-core` in production.
- `fallbackUsed`: Should be `false` when AI Platform Core is reachable.
- `intake.nextAction`: `show_received` or `ask_follow_up`.
- `intake.followUpQuestions`: Questions to show only when more detail is useful.

## UI Guidance

The source app UI should stay native to that app. Feedback Hub does not require a shared visual widget.

Recommended UI elements:

- A compact `質問・改善` entry button.
- A chat-style text input.
- Optional screen capture support later.
- A simple received message after submission.
- Follow-up question chips or prompts when returned.

Do not run classification, grouping, impact scoring, or priority calculation in the source app. Those responsibilities belong to Feedback Hub and AI Platform Core.
