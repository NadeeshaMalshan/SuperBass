# SuperBass Agent Backend - FastAPI Server Entrypoint.
# Provides REST and chat endpoints with Neon PostgreSQL persistence (Booking details card support).

from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel, Field
import uuid
import logging
from pathlib import Path

from agent_backend.config import settings
from agent_backend.schemas.api_models import ChatRequest, ChatResponse
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard
from agent_backend.graph.workflow import graph
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.db.database import init_db
from agent_backend.db.chat_repository import chat_repository
from agent_backend.tools.community_tools import current_post_images
from agent_backend.utils.sanitizer import sanitize_text, extract_text_content
from agent_backend.utils.turn_tracker import TurnUsageLogger

# Configure logging to both console and dedicated ai_chat.log file
log_file_path = Path(__file__).resolve().parent.parent.parent / "ai_chat.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(str(log_file_path), encoding="utf-8", mode="a")
    ]
)
logger = logging.getLogger("agent_backend.api")
logger.info(f"AI Chat logging active. Writing logs to console and {log_file_path}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to initialize database tables on startup."""
    logger.info("Initializing Neon PostgreSQL database tables...")
    await init_db()
    yield
    logger.info("Shutting down agent backend service.")


app = FastAPI(
    title="Workio Agent Backend",
    description="Multi-Agent AI Workflow powered by LangGraph, OpenAI gpt-4o-mini, and MCP Tools with Neon DB Persistence",
    version="0.2.0",
    lifespan=lifespan
)

# Configure CORS
origins = settings.cors_origins if isinstance(settings.cors_origins, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory conversation fallback cache (preserves multi-turn state even if DB is unavailable)
_IN_MEMORY_CONV_CACHE: Dict[str, List[Dict[str, Any]]] = {}

# Conversation Creation Model
class CreateConversationRequest(BaseModel):
    email: str = Field(description="User email address")
    title: Optional[str] = Field(default="New Conversation", description="Thread title")



@app.get("/health")
async def health():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "agent-backend",
        "model": settings.openai_model,
        "database": "Local PostgreSQL" if ("localhost" in settings.database_url or "127.0.0.1" in settings.database_url) else "Neon PostgreSQL",
        "environment": settings.environment
    }


@app.get("/api/mcp/health")
async def mcp_health():
    """Check connectivity to the Workio MCP Server."""
    result = await mcp_client.health_check()
    return result


@app.get("/api/tools")
async def list_available_tools():
    """List tools discovered from the MCP Server."""
    mcp_tools = await mcp_client.list_tools()
    return {"mcp_tools": mcp_tools}


@app.get("/api/workers/{worker_id}/availability")
async def check_worker_availability_api(
    worker_id: str,
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    start_time: Optional[str] = Query("10:00", description="Start time in HH:MM"),
    duration_hours: Optional[int] = Query(2, description="Duration in hours")
):
    """
    Real-time worker availability validation via MCP.
    """
    try:
        from datetime import datetime, timedelta
        target_date = date or datetime.now().strftime("%Y-%m-%d")
        t_start = f"{target_date}T{start_time}:00"
        dur = duration_hours or 2
        
        try:
            dt_start = datetime.fromisoformat(t_start)
            dt_end = dt_start + timedelta(hours=dur)
            t_end = dt_end.isoformat()
        except Exception:
            t_end = f"{target_date}T12:00:00"

        raw = await mcp_client.call_tool(
            "check_worker_availability",
            {
                "workerId": str(worker_id).strip(),
                "startTime": t_start,
                "endTime": t_end
            }
        )
        return raw or {"isAvailable": True, "isSlotAvailable": True, "status": "Available"}
    except Exception as e:
        logger.warning(f"Error checking worker availability: {e}")
        return {
            "workerId": worker_id,
            "isAvailable": True,
            "isSlotAvailable": True,
            "status": "Available",
            "reason": "Worker is available for service"
        }


# -------------------------------------------------------------
# Conversation Management Endpoints (Multiple Chats Support)
# -------------------------------------------------------------

@app.get("/api/conversations")
async def list_user_conversations(email: str = Query(..., description="User email")):
    """List all previous conversation threads for a user."""
    threads = await chat_repository.list_conversations(email)
    return {"conversations": threads}


@app.post("/api/conversations")
async def create_new_conversation(req: CreateConversationRequest):
    """Create a new blank conversation session."""
    conv_id = str(uuid.uuid4())
    conv = await chat_repository.get_or_create_conversation(conv_id, req.email, req.title)
    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "user_email": conv.user_email,
        "created_at": conv.created_at.isoformat() if conv.created_at else None
    }


@app.get("/api/conversations/{conversation_id}")
async def get_conversation_details(conversation_id: str):
    """Fetch complete message and card history for a conversation thread."""
    messages = await chat_repository.get_conversation_messages(conversation_id)
    return {
        "conversation_id": conversation_id,
        "messages": messages
    }


@app.delete("/api/conversations/{conversation_id}")
async def delete_user_conversation(conversation_id: str, email: Optional[str] = None):
    """Delete a conversation thread and its messages."""
    deleted = await chat_repository.delete_conversation(conversation_id, email)
    return {"success": deleted, "conversation_id": conversation_id}


# -------------------------------------------------------------
# Chat Invocation with Database Persistence
# -------------------------------------------------------------

@app.get("/api/chat/logs")
async def get_chat_logs(limit: int = Query(default=100, ge=1, le=1000)):
    """
    Retrieve the latest AI chat logs directly from ai_chat.log.
    """
    if not log_file_path.exists():
        return {
            "status": "success",
            "log_file": str(log_file_path),
            "total_lines": 0,
            "logs": []
        }
    with open(log_file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    return {
        "status": "success",
        "log_file": str(log_file_path),
        "total_lines": len(lines),
        "logs": [l.rstrip() for l in lines[-limit:]]
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint for Frontend UI.
    Takes user input, routes via LangGraph Multi-Agent, saves history in Neon PostgreSQL,
    and returns a typed UI card response.
    """
    conv_id = request.conversation_id or str(uuid.uuid4())
    logger.info("=" * 64)
    logger.info(f"📥 [AI CHAT REQUEST] Thread: '{conv_id}'")
    logger.info(f"   User: {request.email} (Role: {request.user_type})")
    logger.info(f"   Message: \"{request.message}\"")
    if request.metadata:
        logger.info(f"   Metadata: {request.metadata}")
    logger.info("-" * 64)

    try:
        # Pre-extract attached images to ContextVar out-of-band so LLM never sees base64 data
        meta = request.metadata or {}
        post_images = meta.get("post_images") or []
        if not post_images and meta.get("post_data"):
            post_images = meta.get("post_data", {}).get("images") or []
        if post_images:
            current_post_images.set(post_images)

        clean_user_message = sanitize_text(request.message)

        # 1. Retrieve prior messages to supply bounded conversational context
        history_msgs = []
        db_messages = []
        try:
            db_messages = await chat_repository.get_conversation_messages(conv_id)
        except Exception as e:
            logger.warning(f"Could not load DB history for {conv_id}: {e}")

        # Fallback to in-memory conversation cache if DB returned empty or errored
        if not db_messages and conv_id in _IN_MEMORY_CONV_CACHE:
            db_messages = _IN_MEMORY_CONV_CACHE[conv_id]

        recent_db_messages = db_messages[-8:] if len(db_messages) > 8 else db_messages
        for m in recent_db_messages:
            msg_content = sanitize_text(str(m.get("message", "") or ""), max_chars=1200)
            if m.get("sender") == "user":
                history_msgs.append(HumanMessage(content=msg_content))
            elif m.get("sender") == "assistant":
                history_msgs.append(AIMessage(content=msg_content))

        # 2. Retrieve user profile if available
        user_profile = None
        if request.email:
            try:
                user_profile = await mcp_client.call_tool("get_user_details", {"email": request.email})
            except Exception as pe:
                logger.warning(f"Could not load user profile for {request.email}: {pe}")

        # 3. Build initial state for this turn
        initial_state = {
            "messages": history_msgs + [HumanMessage(content=clean_user_message)],
            "email": request.email,
            "user_type": request.user_type,
            "user_profile": user_profile,
            "next": None,
            "structured_response": None,
            "metadata": request.metadata or {}
        }

        # 3. Thread configuration and usage tracker for LangGraph
        tracker = TurnUsageLogger()
        turn_thread_id = f"{conv_id}-{uuid.uuid4().hex[:6]}"
        thread_config = {
            "configurable": {"thread_id": turn_thread_id},
            "recursion_limit": 15,
            "callbacks": [tracker]
        }

        # 4. Execute LangGraph workflow
        final_state = await graph.ainvoke(initial_state, config=thread_config)
        telemetry = tracker.get_summary()

        # 5. Retrieve typed structured UI card
        card_response = final_state.get("structured_response")
        if not card_response:
            # Fallback text card
            messages = final_state.get("messages", [])
            last_text = extract_text_content(messages[-1].content) if messages else "No response generated."
            card_response = AgentCardResponse(
                response_type="text_message",
                message=last_text,
                card_data=TextMessageCard(text=last_text).model_dump(),
                metadata={"agent": "system", "user_email": request.email}
            )

        if card_response and card_response.message:
            import re
            card_response.message = re.sub(r'^(?:\[\s*\]|\(\s*\))\s*', '', card_response.message).strip()

        if card_response.metadata is None:
            card_response.metadata = {}
        card_response.metadata["token_usage"] = {
            "prompt_tokens": telemetry["prompt_tokens"],
            "completion_tokens": telemetry["completion_tokens"],
            "total_tokens": telemetry["total_tokens"]
        }
        card_response.metadata["duration_sec"] = telemetry["duration_sec"]
        card_response.metadata["agents"] = telemetry["agents_involved"]
        card_response.metadata["steps"] = telemetry["steps"]

        # 6. Save turn to in-memory fallback cache
        _IN_MEMORY_CONV_CACHE.setdefault(conv_id, []).extend([
            {"sender": "user", "message": clean_user_message},
            {"sender": "assistant", "message": card_response.message or str(card_response.card_data.get("title", "")) or "response"}
        ])

        # 7. Persist turn to Neon PostgreSQL if available
        try:
            await chat_repository.save_chat_turn(
                conv_id=conv_id,
                user_email=request.email,
                user_text=clean_user_message,
                assistant_card_response=card_response
            )
        except Exception as db_err:
            logger.error(f"Failed to persist chat turn to DB: {db_err}")

        # 8. Detailed Telemetry Log: AI messages, agents, token usage, and latency
        logger.info("🤖 [AI AGENT & TOKEN TELEMETRY]")
        logger.info(f"   ⏱️  Total Duration: {telemetry['duration_sec']}s")
        logger.info(f"   📊 Token Usage: {telemetry['total_tokens']} total (Prompt: {telemetry['prompt_tokens']} | Completion: {telemetry['completion_tokens']})")
        logger.info(f"   🧩 Agents Invoked ({len(telemetry['agents_involved'])}): {', '.join(telemetry['agents_involved']) if telemetry['agents_involved'] else 'direct'}")
        for idx, step in enumerate(telemetry["steps"], 1):
            logger.info(
                f"      [{idx}] Agent: {step['node']} | Time: {step['duration_sec']}s | "
                f"Tokens: {step['total_tokens']} (Prompt: {step['prompt_tokens']} / Completion: {step['completion_tokens']})"
            )
            if step.get("output_summary"):
                logger.info(f"          Output: {step['output_summary']}")

        logger.info(f"📤 [AI CHAT RESPONSE] Thread: '{conv_id}'")
        logger.info(f"   Card Type: '{card_response.response_type}'")
        logger.info(f"   AI Message: \"{card_response.message}\"")
        if isinstance(card_response.card_data, dict):
            summary_keys = list(card_response.card_data.keys())
            logger.info(f"   Card Data keys: {summary_keys}")
        logger.info("=" * 64)

        return ChatResponse(
            conversation_id=conv_id,
            response=card_response
        )

    except Exception as e:
        logger.error(f"Chat processing failed: {e}", exc_info=True)
        return ChatResponse(
            conversation_id=conv_id,
            response=AgentCardResponse(
                response_type="error",
                message=f"An error occurred: {str(e)}",
                card_data={
                    "errorCode": "AGENT_EXECUTION_FAILURE",
                    "message": str(e),
                    "actionRequired": "Please try again or check the server logs."
                },
                metadata={"error": True}
            )
        )


def start():
    """Convenience runner for uvicorn."""
    import uvicorn
    uvicorn.run(
        "agent_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )


if __name__ == "__main__":
    start()
