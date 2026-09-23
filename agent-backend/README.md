# SuperBass Agent Backend 🤖

AI-Powered Multi-Agent System for SuperBass, orchestrated with **LangGraph**, powered by **OpenAI `gpt-4o-mini`**, and executing tools through the **Model Context Protocol (MCP) Server**. Managed with high-performance Python package manager **`uv`**.

---

## 🏗️ Architecture

```
                                      ┌──────────────────────────────────────────────┐
                                      │              Frontend / Mobile App           │
                                      │       (Vite React / Flutter / App Client)    │
                                      └──────────────────────┬───────────────────────┘
                                                             │ POST /api/chat
                                                             ▼
                                      ┌──────────────────────────────────────────────┐
                                      │         Agent Backend (FastAPI :8001)        │
                                      │          StateGraph / LangGraph              │
                                      └──────────────────────┬───────────────────────┘
                                                             │
                              ┌──────────────────────────────┴──────────────────────────────┐
                              ▼                                                             ▼
                   ┌───────────────────────┐                                     ┌──────────────────────┐
                   │    Supervisor Agent   │                                     │    Card Formatter    │
                   │ (Intent Classifier &  │                                     │ (Structured Response │
                   │        Router)        │                                     │     Card Builder)    │
                   └──────────┬────────────┘                                     └──────────▲───────────┘
                              │ Routes intent                                               │
                              ▼                                                             │
                   ┌───────────────────────┐                                                │
                   │    Community Agent    ├────────────────────────────────────────────────┘
                   │(Specialist Sub-Agent) │
                   └──────────┬────────────┘
                              │ MCP tools/call (JSON-RPC 2.0)
                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            SuperBass MCP Server (FastAPI :8000/mcp)                               │
│  - create_community_post   - get_community_posts   - update_community_post                       │
│  - delete_community_post   - get_user_community_posts - get_user_details                          │
│  - search_workers          - get_booking           - create_booking ...                           │
└─────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                              │ HTTP REST
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         SuperBass Core Backend (.NET 8 Web API :5237)                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Features

1. **`uv` Package Manager**: Lightning fast dependency resolution, lockfile management, and virtual environment handling.
2. **LangGraph StateGraph Workflow**:
   - `AgentState`: Tracks conversation messages, active user identity (`email`, `user_type`), routing state, and structured UI response.
   - `MemorySaver`: Session persistence across conversation turns using `conversation_id`.
3. **MCP Tool Integration**: Calls community tools hosted on the SuperBass MCP Server (`http://localhost:8000/mcp`) via JSON-RPC 2.0.
4. **Specialized Multi-Agent Structure**:
   - **Supervisor Agent**: Intelligently routes incoming queries to sub-agents or provides helpful direct responses.
   - **Community Agent**: Specialized in community posts, categories, updates, deletions, user history, and profile inspection.
   - **Extensible for Team**: Designed so team members can effortlessly add `booking_agent` and `worker_agent`.
5. **Structured UI Card Responses**: Every response emitted conforms to a strictly typed Pydantic card model with unique `response_type` tags for dynamic frontend card rendering.

---

## 🚀 Quickstart with `uv`

### 1. Prerequisites
Ensure you have `uv` installed:
```powershell
uv --version
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```powershell
cd d:\Projects_New\SuperBass\agent-backend
copy .env.example .env
```

Edit `.env` and provide your OpenAI API key and backend URLs:
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.2

# MCP Server URL (Model Context Protocol JSON-RPC 2.0)
MCP_SERVER_URL=http://localhost:8000/mcp

# SuperBass Core Backend API URL (ASP.NET Core API)
BACKEND_BASE_URL=http://localhost:5237

# Server Settings
HOST=0.0.0.0
PORT=8001
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://localhost:8000","*"]
```

### 3. Install Dependencies
```powershell
uv sync
```

### 4. Run Automated Test Suite
```powershell
uv run pytest tests/
```

### 5. Start the Agent Backend Server
```powershell
uv run python main.py
```
*Or using uvicorn directly:*
```powershell
uv run uvicorn agent_backend.main:app --host 0.0.0.0 --port 8001 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Health Check**: [http://localhost:8001/health](http://localhost:8001/health)
- **MCP Server Health**: [http://localhost:8001/api/mcp/health](http://localhost:8001/api/mcp/health)

---

## 📡 API Endpoints

### 1. `POST /api/chat`
Main conversational endpoint for UI integration.

#### Request Body
```json
{
  "message": "Can you create a community post for an emergency plumber in Colombo?",
  "email": "kpjmp28@gmail.com",
  "user_type": "Resident",
  "conversation_id": "thread-12345"
}
```

#### Response Envelope
```json
{
  "conversation_id": "thread-12345",
  "response": {
    "response_type": "post_created",
    "message": "Your community post 'Emergency Plumber Needed' has been published successfully!",
    "card_data": {
      "id": 14,
      "title": "Emergency Plumber Needed",
      "content": "Water pipe leak in kitchen. Looking for an experienced plumber immediately.",
      "communityId": "Plumbing",
      "location": "Colombo",
      "authorId": "kpjmp28@gmail.com",
      "authorName": "Kapila Perera",
      "status": "Active",
      "createdAt": "2026-09-23T18:50:00Z"
    },
    "metadata": {
      "agent": "community_agent",
      "user_email": "kpjmp28@gmail.com"
    }
  }
}
```

---

## 🎨 Structured UI Card Reference

The frontend can map `response.response_type` to unique UI cards:

| `response_type` | UI Card Component | Primary Use Case |
|---|---|---|
| `post_created` | `<CommunityPostCreatedCard />` | Confirmed new post creation with action buttons |
| `post_list` | `<CommunityPostListCard />` | Scrollable feed or category filtered search results |
| `post_detail` | `<CommunityPostDetailCard />` | Full view of a specific post with comments & likes |
| `post_updated` | `<CommunityPostUpdatedCard />` | Confirmation of post edits/updates |
| `post_deleted` | `<CommunityPostDeletedCard />` | Feedback confirmation of post removal |
| `user_profile` | `<UserProfileBadgeCard />` | Resident address or worker skills/ratings |
| `text_message` | `<AgentChatBubbleCard />` | General dialogue, greetings, action chips/suggestions |
| `error` | `<AgentActionErrorCard />` | Server error, auth failure, or retry suggestion |

### Example Frontend Switch in React:
```tsx
function RenderAgentMessage({ response }: { response: AgentCardResponse }) {
  switch (response.response_type) {
    case "post_created":
      return <CommunityPostCreatedCard post={response.card_data} />;
    case "post_list":
      return <CommunityPostListCard list={response.card_data} />;
    case "post_detail":
      return <CommunityPostDetailCard post={response.card_data} />;
    case "post_updated":
      return <CommunityPostUpdatedCard update={response.card_data} />;
    case "post_deleted":
      return <CommunityPostDeletedCard removal={response.card_data} />;
    case "user_profile":
      return <UserProfileBadgeCard profile={response.card_data} />;
    case "error":
      return <AgentActionErrorCard error={response.card_data} />;
    case "text_message":
    default:
      return (
        <AgentChatBubble
          message={response.message}
          suggestions={response.card_data.suggestions}
        />
      );
  }
}
```

---

## 🛠️ MCP Tools Integrated

The community agent is equipped with 6 MCP tools:
1. `create_community_post`: Creates a post on the SuperBass community board.
2. `get_community_posts`: Queries posts by category (`General`, `Electrical`, `Plumbing`, `AC`, etc.) or numeric ID.
3. `update_community_post`: Modifies an existing post.
4. `delete_community_post`: Soft-deletes a post (`Removed` status).
5. `get_user_community_posts`: Retrieves all posts authored by a user.
6. `get_user_details`: Retrieves user profile, resident details, and worker skills/ratings.

---

## 👥 Extensibility Guide for Team Members

When adding upcoming agents:
1. **Booking Agent**:
   - Define booking tools wrapping MCP booking tools (`create_booking`, `get_booking`, `reschedule_booking`, `cancel_booking`).
   - Add `booking_agent` node to `src/agent_backend/graph/workflow.py`.
   - Update `supervisor` prompt to route booking intents to `booking_agent`.
2. **Worker Agent**:
   - Define worker search tools wrapping MCP tools (`search_workers`, `get_worker_details`, `get_worker_performance`).
   - Add `worker_agent` node to `src/agent_backend/graph/workflow.py`.
   - Update `supervisor` prompt to route worker discovery requests to `worker_agent`.
