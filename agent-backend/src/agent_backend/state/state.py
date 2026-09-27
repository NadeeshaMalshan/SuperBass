"""
Agent State Definition for SuperBass LangGraph Workflow.
Stores conversation messages, user context, agent routing, and structured output.
"""

from typing import Annotated, Sequence, Optional, Dict, Any, Literal, List
from typing_extensions import TypedDict, NotRequired
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

    # Multi-agent routing indicator ("community_agent", "booking_agent", "worker_matching_agent", "FINISH")
    next: Optional[str]

    # Structured UI Card response to be returned to frontend
    structured_response: Optional[AgentCardResponse]

    # Additional execution metadata or temporary tool outputs
    metadata: Optional[Dict[str, Any]]

    # Worker Matching context (optional fields for worker discovery and selection)
    service: NotRequired[Optional[str]]
    skill: NotRequired[Optional[str]]
    location: NotRequired[Optional[str]]
    max_price: NotRequired[Optional[float]]
    min_rating: NotRequired[Optional[float]]
    matched_workers: NotRequired[Optional[List[Dict[str, Any]]]]
    selected_worker: NotRequired[Optional[Dict[str, Any]]]

