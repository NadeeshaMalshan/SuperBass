"""
Agent State Definition for SuperBass LangGraph Workflow.
Stores conversation messages, user context, agent routing, and structured output.
"""

from typing import Annotated, Sequence, Optional, Dict, Any, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from agent_backend.schemas.card_models import AgentCardResponse


class AgentState(TypedDict):
    """
    Main state tracked throughout the multi-agent graph.
    Maintains user context (email, role), dialogue history, agent routing, and final UI response.
    """
    # Conversation messages with automatic list concatenation via add_messages reducer
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # User identity and profile context
    email: str
    user_type: Literal["Resident", "Worker", "Unknown"]
    user_profile: Optional[Dict[str, Any]]

    # Multi-agent routing indicator ("community_agent", "FINISH", or future agents)
    next: Optional[str]

    # Structured UI Card response to be returned to frontend
    structured_response: Optional[AgentCardResponse]

    # Additional execution metadata or temporary tool outputs
    metadata: Optional[Dict[str, Any]]
