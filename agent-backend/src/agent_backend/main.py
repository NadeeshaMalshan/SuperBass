"""
Workio Agent Backend - FastAPI Server Entrypoint.
Provides REST and chat endpoints for interacting with the LangGraph multi-agent system,
with persistent conversation history in Neon PostgreSQL.
"""

from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel, Field
import uuid
import logging

from agent_backend.config import settings
from agent_backend.schemas.api_models import ChatRequest, ChatResponse
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard
from agent_backend.graph.workflow import graph
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.db.database import init_db
from agent_backend.db.chat_repository import chat_repository
from agent_backend.tools.community_tools import current_post_images
from agent_backend.utils.sanitizer import sanitize_text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agent_backend.api")


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

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint for Frontend UI.
    Takes user input, routes via LangGraph Multi-Agent, saves history in Neon PostgreSQL,
    and returns a typed UI card response.
    """
    conv_id = request.conversation_id or str(uuid.uuid4())
    logger.info(
        f"Incoming chat request for thread '{conv_id}' from '{request.email}' ({request.user_type}): {request.message}"
    )

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

        # 3. Thread configuration for LangGraph (per-turn execution ID to prevent duplicate append)
        turn_thread_id = f"{conv_id}-{uuid.uuid4().hex[:6]}"
        thread_config = {"configurable": {"thread_id": turn_thread_id}}

        # 4. Execute LangGraph workflow
        final_state = await graph.ainvoke(initial_state, config=thread_config)

        # 5. Retrieve typed structured UI card
        card_response = final_state.get("structured_response")
        if not card_response:
            # Fallback text card
            messages = final_state.get("messages", [])
            last_text = messages[-1].content if messages else "No response generated."
            card_response = AgentCardResponse(
                response_type="text_message",
                message=last_text,
                card_data=TextMessageCard(text=last_text).model_dump(),
                metadata={"agent": "system", "user_email": request.email}
            )

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
