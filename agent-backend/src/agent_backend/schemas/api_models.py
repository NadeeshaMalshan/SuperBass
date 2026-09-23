"""
FastAPI Request and Response Models for Agent Backend API.
"""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from agent_backend.schemas.card_models import AgentCardResponse


class ChatRequest(BaseModel):
    """Payload sent by Frontend/Client when submitting a chat prompt."""
    message: str = Field(description="The user's input prompt or instruction")
    email: str = Field(
        default="resident@superbass.lk",
        description="The authenticated user's email address"
    )
    user_type: Literal["Resident", "Worker", "Unknown"] = Field(
        default="Resident",
        description="User role in SuperBass platform"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Thread/conversation ID for state persistence across turns"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional client metadata (device, geolocation, etc.)"
    )


class ChatResponse(BaseModel):
    """Response returned to Frontend containing structured card and conversation tracking."""
    conversation_id: str = Field(description="Conversation thread identifier")
    response: AgentCardResponse = Field(description="Structured card response for UI rendering")
