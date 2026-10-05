# Workio Agentic AI System - Full Architecture Diagram

## Overview
This diagram illustrates the complete agentic AI architecture for the Workio platform, showing all components, data flows, and interaction patterns.

```mermaid
graph TD
    %% ===== USER INTERFACE LAYER =====
    subgraph UI_LAYER["User Interface Layer"]
        direction TB
        Browser[User/Browser] -->|HTTP Requests| Frontend[React/Vite Frontend<br/>(AiCommunityChat.jsx)]
        Frontend -->|POST /api/chat| Backend[FastAPI Agent Backend :8001]
    end

    %% ===== AGENT BACKEND LAYER =====
    subgraph AGENT_BACKEND["Agent Backend Layer"]
        direction TB
        Backend -->|JSON-RPC 2.0| LangGraph[LangGraph StateGraph<br/>(AgentState Reducer)]
        
        %% Supervisor Agent
        LangGraph -->|Route Intent| Supervisor[Supervisor Agent<br/>(LLM #1: gpt-4o-mini)]
        Supervisor -->|Intent Classification & Router| 
        
        %% Specialist Agents
        Supervisor -->|community_agent| CommunityAgent[Community Agent<br/>(LLM Node)]
        Supervisor -->|worker_matching_agent| WorkerMatchingAgent[Worker Matching Agent<br/>(LLM Node)]
        Supervisor -->|booking_agent| BookingAgent[Booking Agent<br/>(LLM Node)]
        Supervisor -->|support_review_agent| SupportReviewAgent[Support & Review Agent<br/>(LLM Node)]
        
        %% Tool Nodes
        CommunityAgent -->|tools_condition| CommunityTools[Community Tools<br/>(ToolNode)]
        WorkerMatchingAgent -->|tools_condition| WorkerMatchingTools[Worker Tools<br/>(ToolNode)]
        BookingAgent -->|tools_condition| BookingTools[Booking Tools<br/>(ToolNode)]
        SupportReviewAgent -->|tools_condition| SupportReviewTools[Support Tools<br/>(ToolNode)]
        
        %% Tool Loops
        CommunityTools -->|Tool Output| CommunityAgent
        WorkerMatchingTools -->|Tool Output| WorkerMatchingAgent
        BookingTools -->|Tool Output| BookingAgent
        SupportReviewTools -->|Tool Output| SupportReviewAgent
        
        %% Termination
        CommunityAgent -->|no tools / complete| End[END]
        WorkerMatchingAgent -->|no tools / complete| End
        BookingAgent -->|no tools / complete| End
        SupportReviewAgent -->|no tools / complete| End
        
        %% Supervisor Routing
        Supervisor -->|FINISH / Direct Answer| End
    end

    %% ===== MCP SERVER LAYER =====
    subgraph MCP_SERVER["MCP Server Layer"]
        direction TB
        CommunityTools -->|JSON-RPC 2.0| MCP[Workio MCP Server :8000<br/>(18 Standardized MCP Tools)]
        WorkerMatchingTools -->|JSON-RPC 2.0| MCP
        BookingTools -->|JSON-RPC 2.0| MCP
        SupportReviewTools -->|JSON-RPC 2.0| MCP
        
        MCP -->|JWT Bearer Auth| DotNetCore[SuperBass .NET Core Backend<br>:5237]
    end

    %% ===== DATABASE LAYER =====
    subgraph DATABASE_LAYER["Database Layer"]
        direction TB
        DotNetCore -->|SQL Queries| PostgreSQL[PostgreSQL Database Core]
    end

    %% ===== STATE MANAGEMENT LAYER =====
    subgraph STATE_MANAGEMENT["State Management Layer"]
        direction TB
        LangGraph -->|Session Checkpoint| MemorySaver[MemorySaver<br/>(RAM - per turn thread_id)]
        LangGraph -->|Long-term Persistence| NeonDB[Neon PostgreSQL<br/>- ai_conversations<br/>- ai_chat_messages]
    end

    %% ===== SPECIALIZED AGENT DETAILS =====
    subgraph AGENT_DETAILS["Agent Responsibilities"]
        direction TB
        CommunityAgent -->|Post CRUD| CommunityPost[Community Post Management]
        CommunityAgent -->|Category Feed| CommunityFeed[Category-based Post Feeds]
        CommunityAgent -->|Media Handler| CommunityMedia[Image/Attachment Handling]
        
        WorkerMatchingAgent -->|Haversine GPS| WorkerGPS[Geospatial Proximity Ranking]
        WorkerMatchingAgent -->|Vetting & Rate| WorkerVetting[Technician Vetting & Rating]
        WorkerMatchingAgent -->|Skill Matches| WorkerSkills[Skill-based Matching]
        
        BookingAgent -->|Slot Checking| BookingSlots[Real-time Availability Checking]
        BookingAgent -->|Date Parsing| BookingDates[DateTime Normalization]
        BookingAgent -->|Appointments| BookingMgmt[Appointment Scheduling]
        
        SupportReviewAgent -->|Post-Job Stars| SupportRatings[Worker Review System]
        SupportReviewAgent -->|Dispute Ticket| SupportDisputes[Dispute Ticket Filing]
        SupportReviewAgent -->|RAG Policies| SupportRAG[Policy Knowledge Base]
    end

    %% ===== TELEMETRY & OBSERVABILITY =====
    subgraph OBSERVABILITY["Observability & Telemetry"]
        direction TB
        Backend -->|Logs| Console[Console Stdout]
        Backend -->|Logs| LogFile[ai_chat.log Persistent Log]
        Backend -->|Telemetry| HealthEndpoint[GET /health]
        Backend -->|Telemetry| MCPHealth[GET /api/mcp/health]
        Backend -->|Telemetry| ChatLogs[GET /api/chat/logs]
    end

    %% ===== STYLING =====
    classDef layerStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef agentStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:1px;
    classDef toolStyle fill:#fff3e0,stroke:#f57c00,stroke-width:1px;
    classDef mcpStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:1px;
    classDef dbStyle fill:#f3e5f5,stroke:#6a1b9a,stroke-width:1px;
    classDef stateStyle fill:#fff8e1,stroke:#ffb300,stroke-width:1px;
    classDef detailStyle fill:#fce4ec,stroke:#c2185b,stroke-width:1px;
    classDef obsStyle fill:#e0f7fa,stroke:#006064,stroke-width:1px;
    
    class UI_LAYER,AGENT_BACKEND,MCP_SERVER,DATABASE_LAYER,STATE_MANAGEMENT layerStyle;
    class Supervisor,CommunityAgent,WorkerMatchingAgent,BookingAgent,SupportReviewAgent agentStyle;
    class CommunityTools,WorkerMatchingTools,BookingTools,SupportReviewTools toolStyle;
    class MCP mcpStyle;
    class PostgreSQL dbStyle;
    class MemorySaver,NeonDB stateStyle;
    class CommunityPost,CommunityFeed,CommunityMedia,WorkerGPS,WorkerVetting,WorkerSkills,BookingSlots,BookingDates,BookingMgmt,SupportRatings,SupportDisputes,SupportRAG detailStyle;
    class Console,LogFile,HealthEndpoint,MCPHealth,ChatLogs obsStyle;
```

## Key Architectural Components

### 1. **Supervisor Agent** (Central Router)
- **Role**: Intent classification, category normalization, and dynamic routing
- **LLM**: `gpt-4o-mini` with structured output
- **Responsibilities**:
  - Evaluates user intent without fragile regex
  - Fetches 21 live Workio service categories
  - Routes to appropriate specialist agent or returns direct response
  - Supplies contextual suggestion chips

### 2. **Community Agent**
- **Domain**: Community classified posts and emergency service requests
- **Tools**: Post CRUD, category feed, media handling
- **UI Cards**: PostConfirmationCard, PostCreatedCard, PostListCard, etc.

### 3. **Worker Matching Agent** (Find Agent)
- **Domain**: Technician discovery and matching
- **Tools**: Haversine GPS search, skill matching, vetting
- **UI Cards**: WorkerListCard with verified badges, rates, ratings

### 4. **Booking Agent**
- **Domain**: Appointment scheduling and management
- **Tools**: Slot checking, date parsing, appointment creation
- **UI Cards**: BookingFormCard, BookingConfirmedCard, BookingListCard

### 5. **Support & Review Agent** (Review Agent)
- **Domain**: Post-service reviews, disputes, and support
- **Tools**: Review submission, dispute filing, policy RAG
- **UI Cards**: ReviewFormCard, ReviewSubmittedCard, DisputeTicketCard

### 6. **Model Context Protocol (MCP) Layer**
- **Transport**: JSON-RPC 2.0 over HTTP
- **Endpoint**: `http://localhost:8000/mcp`
- **Tools**: 18 standardized MCP tools covering all domain operations
- **Security**: Zero-trust JWT authentication

### 7. **State Management**
- **Short-term**: LangGraph MemorySaver (per-turn checkpointing)
- **Long-term**: Neon PostgreSQL persistence
- **Pattern**: Loads most recent 8 messages for bounded context

### 8. **Human-in-the-Loop (HITL) Gates**
- **Community Posts**: PostConfirmationCard requires explicit confirmation
- **Bookings**: BookingFormCard requires slot selection and confirmation
- **Reviews**: ReviewFormCard requires visual rating adjustment
- **Disputes**: DisputeTicketCard requires explicit filing confirmation

## Data Flow Patterns

### Typical Request Flow:
1. User → Frontend → FastAPI Backend
2. Backend → LangGraph StateGraph
3. StateGraph → Supervisor Agent (intent classification)
4. Supervisor → Specialist Agent (based on intent)
5. Specialist Agent → MCP Tools (JSON-RPC 2.0)
6. MCP Tools → .NET Core Backend → PostgreSQL
7. Results flow back through the same path
8. Specialist Agent formats response → Frontend UI Card

### Tool Execution Loop (ReAct Pattern):
Specialist Agent ↔ Tool Node (continues until task completion)

This architecture ensures loose coupling, scalability, and maintainability while providing a rich, interactive user experience through the agentic AI system.