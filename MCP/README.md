# SuperBass Model Context Protocol (MCP) Server

An enterprise-ready implementation of the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that connects AI assistants (Claude Code, Claude Desktop, Antigravity, and custom LLM agents) directly to the **SuperBass Backend API**.

---

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites & Configuration](#prerequisites--configuration)
- [How to Run the MCP Server](#how-to-run-the-mcp-server)
- [How to Run & Test All Tools](#how-to-run--test-all-tools)
  - [Option A: Automated Test Suite (Fastest)](#option-a-automated-test-suite-fastest)
  - [Option B: Postman Collection (Interactive UI)](#option-b-postman-collection-interactive-ui)
  - [Option C: PowerShell / Terminal (Direct JSON-RPC)](#option-c-powershell--terminal-direct-json-rpc)
  - [Option D: Connecting via Claude Desktop](#option-d-connecting-via-claude-desktop)
- [Available Tools Reference (All 14 Tools)](#available-tools-reference-all-14-tools)
  - [Worker Management Tools (4)](#1-worker-management-tools)
  - [Booking Management Tools (5)](#2-booking-management-tools)
  - [Community Tools (4)](#3-community-tools)
  - [Review Tools (1)](#4-review-tools)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Overview

The MCP Server translates standardized AI tool calls into HTTP REST requests to the SuperBass backend and returns structured JSON responses back to the model.

- **Protocol Version**: `2024-11-05`
- **Supported Transports**: HTTP POST (JSON-RPC 2.0) & Server-Sent Events (SSE)
- **Total Registered Tools**: **14 Tools**
- **Default Port**: `8000`
- **Backend API Port**: `5237` (or `5000`)

---

## Architecture

```text
[ AI Client / Claude Desktop / Postman ]
                   │
            (MCP JSON-RPC 2.0 / SSE)
                   ▼
     [ FastAPI MCP Server (Port 8000) ]
                   │
            (HTTP REST via httpx)
                   ▼
   [ SuperBass Backend API (Port 5237 / 5000) ]
                   │
          [ SuperBass Database ]
```

---

## Prerequisites & Configuration

### Prerequisites
- **Python 3.10+**
- **SuperBass Backend**: Make sure the backend (`dotnet run` in `backend/`) is running so the tools can query real data.

### Configuration (`.env`)
The server automatically loads environment variables from `.env` in the `MCP/` directory:

```env
# URL of the SuperBass backend API
BACKEND_BASE_URL=http://localhost:5237

# MCP Server Port
PORT=8000
```

---

## How to Run the MCP Server

### 1. Install Dependencies
```powershell
cd d:\Projects_New\SuperBass\MCP
pip install -r requirements.txt
```

### 2. Start the Server
```powershell
python main.py
```
*Or with automatic reload during development:*
```powershell
uvicorn main:app --reload --port 8000
```

### 3. Verify Server is Running
Open in your browser:
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health) &rarr; `{"status":"healthy"}`
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## How to Run & Test All Tools

You can verify and interact with all 14 tools using any of the four options below:

### Option A: Automated Test Suite (Fastest)

Run the included automated test runner that executes discovery, worker tools, booking lifecycle, and community post lifecycle in sequence:

```powershell
cd d:\Projects_New\SuperBass\MCP
python run_tests.py
```

This tests:
1. `initialize` & `tools/list` handshake
2. `search_workers`
3. `get_worker_details`
4. `get_worker_performance`
5. `check_worker_availability`
6. `create_booking` &rarr; `get_booking` &rarr; `get_resident_bookings`
7. `reschedule_booking` &rarr; `create_worker_review` &rarr; `cancel_booking`
8. `create_community_post` &rarr; `get_community_posts` &rarr; `update_community_post` &rarr; `delete_community_post`

---

### Option B: Postman Collection (Interactive UI)

1. Open **Postman**.
2. Click **Import** (top left).
3. Select or drag & drop:
   `d:\Projects_New\SuperBass\MCP\SuperBass_MCP.postman_collection.json`
4. All 14 tools and discovery endpoints are organized into folders with pre-configured variables:
   - `{{base_url}}`: `http://localhost:8000`
   - `{{worker_id}}`: `13`
   - `{{resident_id}}`: `kpjmp28@gmail.com`
   - `{{booking_id}}`: `8`
5. Click **Send** on any request to execute.

---

### Option C: PowerShell / Terminal (Direct JSON-RPC)

Send requests to `POST http://localhost:8000/mcp` with `Content-Type: application/json`:

#### Example 1: List all tools
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method Post -ContentType "application/json" -Body '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | ConvertTo-Json -Depth 5
```

#### Example 2: Call `search_workers`
```powershell
$body = @{
    jsonrpc = "2.0"
    id = "search-1"
    method = "tools/call"
    params = @{
        name = "search_workers"
        arguments = @{ query = "plumber"; page = 1; pageSize = 10 }
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method Post -ContentType "application/json" -Body $body
```

---

### Option D: Connecting via Claude Desktop

To use these tools inside Claude Desktop, add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "superbass": {
      "command": "python",
      "args": ["d:\\Projects_New\\SuperBass\\MCP\\main.py"]
    }
  }
}
```

---

## Available Tools Reference (All 14 Tools)

### 1. Worker Management Tools

#### `search_workers`
Search for workers matching search terms, skills, or availability.
- **Backend Endpoint**: `GET /api/Workers/search`
- **Arguments**:
  - `query` *(string, optional)*: Search keyword
  - `skill` *(string, optional)*: Filter by skill (e.g., `"Plumbing"`, `"Electrical"`)
  - `availability` *(string, optional)*: Filter by availability status
  - `page` *(integer, optional)*: Page number (default: 1)
  - `pageSize` *(integer, optional)*: Number of results per page (default: 10)

#### `get_worker_details`
Retrieve detailed profile information for a specific worker.
- **Backend Endpoint**: `GET /api/Workers/{workerId}`
- **Arguments**:
  - `workerId` *(string/integer, required)*: ID of the worker (e.g., `"13"`)

#### `get_worker_performance`
Retrieve calculated performance metrics (acceptance rate, completion rate, ratings).
- **Backend Endpoint**: `GET /api/Workers/{workerId}/performance`
- **Arguments**:
  - `workerId` *(string/integer, required)*: ID of the worker

#### `check_worker_availability`
Check if a worker is available during a requested time window.
- **Backend Endpoint**: `GET /api/Workers/{workerId}/availability`
- **Arguments**:
  - `workerId` *(string/integer, required)*: ID of the worker
  - `startTime` *(string ISO 8601, required)*: Slot start (e.g., `"2026-09-25T09:00:00Z"`)
  - `endTime` *(string ISO 8601, required)*: Slot end (e.g., `"2026-09-25T11:00:00Z"`)

---

### 2. Booking Management Tools

#### `create_booking`
Create a new booking and automatically link/create a chat conversation.
- **Backend Endpoint**: `POST /api/Bookings`
- **Arguments**:
  - `workerId` *(string/integer, required)*: ID of the worker
  - `residentId` *(string, required)*: Resident email or identifier (e.g., `"resident@superbass.lk"`)
  - `startTime` *(string ISO 8601, required)*: Scheduled booking time
  - `endTime` *(string ISO 8601, required)*: End time
  - `notes` *(string, optional)*: Service description or notes

#### `get_booking`
Get full details and status of a booking by its ID.
- **Backend Endpoint**: `GET /api/Bookings/{bookingId}`
- **Arguments**:
  - `bookingId` *(string/integer, required)*: Booking ID

#### `get_resident_bookings`
List all bookings made by a specific resident.
- **Backend Endpoint**: `GET /api/Bookings/resident?email={residentId}`
- **Arguments**:
  - `residentId` *(string, required)*: Resident email address
  - `upcomingOnly` *(boolean, optional)*: If `true`, returns only upcoming bookings (default: `false`)

#### `reschedule_booking`
Reschedule an existing booking to a new time and date.
- **Backend Endpoint**: `POST /api/Bookings/{bookingId}/reschedule`
- **Arguments**:
  - `bookingId` *(string/integer, required)*: Booking ID
  - `startTime` *(string ISO 8601, required)*: New scheduled date/time
  - `endTime` *(string ISO 8601, optional)*: New end date/time
  - `reason` *(string, optional)*: Reason for rescheduling

#### `cancel_booking`
Cancel an active booking.
- **Backend Endpoint**: `POST /api/Bookings/{bookingId}/cancel`
- **Arguments**:
  - `bookingId` *(string/integer, required)*: Booking ID
  - `reason` *(string, optional)*: Cancellation reason (default: `"Cancelled by user"`)

---

### 3. Community Tools

#### `create_community_post`
Publish a new community post.
- **Backend Endpoint**: `POST /api/community-posts`
- **Arguments**:
  - `authorId` *(string, required)*: Author user ID or email
  - `title` *(string, required)*: Post title
  - `content` *(string, required)*: Post body content
  - `communityId` *(string, required)*: Category or community identifier (e.g., `"General"`, `"Electrical"`)
  - `location` *(string, optional)*: Service location (default: `"Colombo"`)

#### `get_community_posts`
List community posts with optional category filtering and pagination.
- **Backend Endpoint**: `GET /api/community-posts` or `GET /api/community-posts/{id}`
- **Arguments**:
  - `communityId` *(string, required)*: Category filter or numeric post ID
  - `limit` *(integer, optional)*: Maximum number of posts to return
  - `offset` *(integer, optional)*: Pagination offset

#### `update_community_post`
Update an existing community post with author authorization.
- **Backend Endpoint**: `PUT /api/community-posts/{postId}`
- **Arguments**:
  - `postId` *(integer/string, required)*: ID of the post to update
  - `title` *(string, required)*: New title
  - `content` *(string, required)*: New content
  - `communityId` *(string, optional)*: Category ID
  - `location` *(string, optional)*: Location
  - `authorId` *(string, optional)*: Author ID or email for verification

#### `delete_community_post`
Soft-delete an existing community post (status updated to `"Removed"`).
- **Backend Endpoint**: `DELETE /api/community-posts/{postId}`
- **Arguments**:
  - `postId` *(integer/string, required)*: ID of the post to delete
  - `authorId` *(string, optional)*: Author ID or email for verification

---

### 4. Review Tools

#### `create_worker_review`
Submit a star rating and review comment for a completed booking.
- **Backend Endpoint**: `POST /api/Bookings/{bookingId}/review`
- **Arguments**:
  - `bookingId` *(string/integer, required)*: Booking ID
  - `workerId` *(string/integer, required)*: Worker ID
  - `residentId` *(string, required)*: Reviewer resident ID or email
  - `rating` *(integer 1-5, required)*: Rating score
  - `comment` *(string, optional)*: Written review comment

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/mcp` | Primary MCP JSON-RPC 2.0 endpoint |
| `GET` | `/mcp/sse` | MCP Server-Sent Events (SSE) endpoint |
| `GET` | `/health` | Health check endpoint (`{"status":"healthy"}`) |
| `GET` | `/docs` | Swagger interactive API documentation |
| `GET` | `/` | Server welcome message |

---

## Troubleshooting

### 1. Backend Connection Issues
If tool calls return `Backend error: 500` or connection refused:
- Verify your SuperBass .NET backend is running (`dotnet run` in `backend/`).
- Confirm the port matches `BACKEND_BASE_URL` in `MCP/.env` (default is `http://localhost:5237`).

### 2. Port 8000 Already in Use
If port 8000 is occupied, set a custom port in `.env` or start with:
```powershell
uvicorn main:app --port 8001
```

### 3. Invalid Params
Ensure requests follow standard MCP JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```