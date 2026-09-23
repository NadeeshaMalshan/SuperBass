"""
SuperBass Agent Backend - FastAPI Server Entrypoint.
Provides REST and chat endpoints for interacting with the LangGraph multi-agent system.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
import uuid
import logging

from agent_backend.config import settings
from agent_backend.schemas.api_models import ChatRequest, ChatResponse
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard
from agent_backend.graph.workflow import graph
from agent_backend.tools.mcp_client import mcp_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agent_backend.api")

app = FastAPI(
    title="SuperBass Agent Backend",
    description="Multi-Agent AI Workflow powered by LangGraph, OpenAI gpt-4o-mini, and MCP Tools",
    version="0.1.0"
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


@app.get("/health")
async def health():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "agent-backend",
        "model": settings.openai_model,
        "environment": settings.environment
    }


@app.get("/api/mcp/health")
async def mcp_health():
    """Check connectivity to the SuperBass MCP Server."""
    result = await mcp_client.health_check()
    return result


@app.get("/api/tools")
async def list_available_tools():
    """List tools discovered from the MCP Server."""
    mcp_tools = await mcp_client.list_tools()
    return {"mcp_tools": mcp_tools}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint for Frontend UI.
    Takes user input, routes via LangGraph Multi-Agent, and returns a typed UI card response.
    """
    conv_id = request.conversation_id or str(uuid.uuid4())
    logger.info(f"Incoming chat request for thread '{conv_id}' from '{request.email}' ({request.user_type}): {request.message}")

    try:
        initial_state = {
            "messages": [HumanMessage(content=request.message)],
            "email": request.email,
            "user_type": request.user_type,
            "user_profile": None,
            "next": None,
            "structured_response": None,
            "metadata": request.metadata or {}
        }

        # Thread configuration for LangGraph checkpointer state persistence
        thread_config = {"configurable": {"thread_id": conv_id}}

        # Execute LangGraph workflow
        final_state = await graph.ainvoke(initial_state, config=thread_config)

        # Retrieve typed structured UI card
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
