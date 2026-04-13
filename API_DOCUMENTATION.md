# Unify AI Builder — Backend API

A session-based conversational backend that guides users through building apps via an AI-powered chat interface. Built with Node.js, Express, MongoDB, and Google Gemini.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AI**: Google Gemini
- **GraphQL**: Apollo (via axios)
- **Streaming**: Server-Sent Events (SSE)

---

## Project Structure
```
src/
│
├── controllers/          # Handles incoming requests & responses
│   ├── sessionController.js
│   ├── messageController.js
│   └── generateController.js
│
├── routes/               # Defines API routes
│   └── sessionRoutes.js
│
├── services/             # Core business logic
│   ├── stateMachine.js
│   ├── draftService.js
│   ├── generateService.js
│   └── graphqlService.js
│
├── models/               # MongoDB schemas
│   ├── unifySession.js
│   └── unifyMessage.js
│
├── config/               # Configuration files
│   ├── db.js
│   └── gemini.js
│
├── app.js                # Express app setup
└── server.js             # Entry point
```
---

## Getting Started

### 1. Clone the repo
```bash
git clone <repo-url>
cd <repo-folder>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```env
MONGO_URI=your_mongodb_connection_string
GRAPHQL_URI=your_graphql_endpoint
BEARER_TOKEN=your_bearer_token
PORT=5000
```

### 4. Start the server
```bash
node server.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/unify/sessions` | Create a new session |
| GET | `/api/unify/sessions/:sessionId` | Resume a session |
| POST | `/api/unify/sessions/:sessionId/messages` | Send a message |
| POST | `/api/unify/sessions/:sessionId/generate` | Trigger app generation |
| GET | `/api/unify/sessions/:sessionId/generate/stream` | Stream generation progress |

---

## Conversation Flow
ask_goal → ask_app_name → ask_category → ask_workflow
→ ask_tracking_entities → ask_pain_point → review
→ generating → done

After all 6 steps are completed, the draft is **automatically generated** and returned in the same response. No separate draft endpoint needed.

---

## Session Status Flow
active → draft_ready → generating → completed
→ failed

---

## Authentication

All endpoints require a Bearer token in the Authorization header:
Authorization: Bearer <token>

The token is stored in the session on creation and reused for all subsequent GraphQL calls.

---

## Example Usage

### 1. Create Session
```bash
curl -X POST http://localhost:5000/api/unify/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "org_123", "userId": "user_123", "entryPoint": "ai_app_builder"}'
```

### 2. Send Messages
```bash
curl -X POST http://localhost:5000/api/unify/sessions/:sessionId/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to build an attendance tracker"}'
```

### 3. Trigger Generation
```bash
curl -X POST http://localhost:5000/api/unify/sessions/:sessionId/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"confirmed": true}'
```

### 4. Stream Progress
```bash
curl -N http://localhost:5000/api/unify/sessions/:sessionId/generate/stream \
  -H "Authorization: Bearer <token>"
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| MISSING_FIELDS | 400 | Required fields are missing |
| UNAUTHORIZED | 401 | Bearer token is missing or invalid |
| SESSION_NOT_FOUND | 404 | Session does not exist |
| SESSION_NOT_ACTIVE | 400 | Session is not in active state |
| DRAFT_NOT_READY | 400 | Draft must exist before generation |
| INVALID_STATUS | 400 | Session is not in draft_ready state |
| NOT_CONFIRMED | 400 | confirmed must be true |
| JOB_NOT_FOUND | 404 | No generation job found for session |
| SERVER_ERROR | 500 | Internal server error |

---

## Notes

- Draft is auto-generated after the final conversation step — no separate draft endpoint needed
- SSE streaming provides real-time progress updates during app creation
- `clientMessageId` can be passed in messages for idempotency (safe to retry)
- Token is stored in session on creation and used for all GraphQL calls automatically