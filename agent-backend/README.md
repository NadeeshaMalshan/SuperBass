# Workio Agent Backend 🤖

AI-Powered Multi-Agent System for Workio, orchestrated with **LangGraph**, powered by **OpenAI `gpt-4o-mini`**, and executing tools through the **Model Context Protocol (MCP) Server**. Managed with high-performance Python package manager **`uv`**.

---

## 🏗️ Workio Architecture A

```text
                         USER / BROWSER
                               │
                               ▼
                       React / Vite
                               │
                         POST /api/chat
                               │
                               ▼
                       FastAPI :8001
                               │
                               ▼
                       LangGraph Workflow
                               │
                               ▼
                    ┌─────────────────────┐
                    │  SUPERVISOR AGENT   │
                    │       LLM #1        │
                    │                     │
                    │ Intent / Routing /  │
                    │ Clarification       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         Community        Worker Matching    Booking
           Agent               Agent          Agent
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                       Support / Review
                             Agent
                               │
                               ▼
                         MCP ToolNodes
                               │
                               ▼
                         MCP Server
                               │
                               ▼
                       .NET Backend
                               │
                               ▼
                          PostgreSQL
                               │
                               ▼
                         Tool Result
                               │
                               ▼
                      Specialist Agent
                               │
                ┌──────────────┴──────────────┐
                │ Domain reasoning             │
                │ Tool-result interpretation  │
                │ Structured output            │
                └──────────────┬──────────────┘
                               │
                               ▼
                     AgentCardResponse
                {response_type, message, card_data}
                               │
                               ▼
                              END
                               │
                               ▼
                            FastAPI
                               │
                               ▼
                    React MessageRenderer
                               │
                               ▼
                     Predefined UI Card
```

> **The Specialist Agent directly interprets MCP tool results and produces the validated structured AgentCardResponse. No separate Card Formatter node or LLM-based formatting stage exists in the LangGraph workflow.**

> **The architecture contains two logical LLM stages: Supervisor and Specialist Agent. The Specialist Agent may perform multiple reasoning/tool iterations depending on the workflow.**

---

## ⚡ Features

1. **`uv` Package Manager**: Lightning fast dependency resolution, lockfile management, and virtual environment handling.
2. **LangGraph StateGraph Workflow (Architecture A)**:
   - `AgentState`: Tracks conversation messages, active user identity (`email`, `user_type`), routing state, and structured UI response.
   - `MemorySaver`: Session persistence across conversation turns using `conversation_id`.
   - Direct execution from Specialist Agent to `END` without any separate formatting stage.
3. **MCP Tool Integration**: Executes domain tools hosted on the Workio MCP Server (`http://localhost:8000/mcp`) via JSON-RPC 2.0.
4. **Specialized Multi-Agent Structure**:
   - **Supervisor Agent**: Intelligently routes incoming queries to sub-agents or provides helpful direct responses.
   - **Community Agent**: Specialized in community posts, categories, updates, deletions, user history, and profile inspection.
   - **Worker Matching Agent**: Specialized in technician search, filtering by rate/rating, and worker profile details.
   - **Booking Agent**: Specialized in worker availability inspection, booking creation, and cancellation.
   - **Support & Review Agent**: Specialized in worker reviews, ratings submission, and performance metric retrieval.
5. **Structured UI Card Responses**: Every response emitted conforms to a strictly typed Pydantic card model (`AgentCardResponse`) with unique `response_type` tags for dynamic frontend card rendering.

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

## 🛠️ Specialist Agents & Integrated MCP Tools

The system features 4 specialized agents connected to the MCP Server:

### 1. Community Agent (`community_agent`)
- `create_community_post`: Creates a post on the community board with optional images.
- `get_community_posts`: Queries posts by category (`General`, `Electrical`, `Plumbing`, `AC`, etc.) or ID.
- `update_community_post`: Modifies an existing post title, content, or category.
- `delete_community_post`: Soft-deletes a post (`Removed` status).
- `get_user_community_posts`: Retrieves all posts authored by a user.
- `get_user_details`: Retrieves user profile, resident details, and worker skills/ratings.
- `get_service_categories`: Retrieves official service categories.

### 2. Worker Matching Agent (`worker_matching_agent`)
- `search_workers`: Searches and filters workers by profession, hourly rate, rating, and location.
- `get_worker_details`: Retrieves comprehensive worker profile, skills, verified badges, and reviews.
- `get_worker_performance`: Retrieves completed job metrics, ratings, and customer reviews.

### 3. Booking Agent (`booking_agent`)
- `check_worker_availability`: Verifies real-time calendar and time slot availability.
- `create_booking`: Initiates a new booking appointment with a worker.
- `get_resident_bookings`: Retrieves active and upcoming bookings for the resident.
- `cancel_booking`: Cancels a confirmed or pending booking appointment.

### 4. Support & Review Agent (`support_review_agent`)
- `create_worker_review`: Submits rating and feedback for completed jobs.
- `get_worker_performance`: Retrieves worker performance metrics and dispute status.
- `get_user_details`: Fetches user profile for account support.

