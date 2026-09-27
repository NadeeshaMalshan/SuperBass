"""
Supervisor Agent Node for SuperBass Multi-Agent System.
Inspects incoming user messages and determines whether to route to the community_agent,
answer directly, or route to future specialized agents.
"""

from typing import Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.prompts.supervisor_prompts import SUPERVISOR_SYSTEM_PROMPT


class SupervisorDecision(BaseModel):
    """Routing decision made by the Supervisor Agent."""
    next_agent: Literal["community_agent", "booking_agent", "FINISH"] = Field(
        description="The next sub-agent to delegate the task to, or 'FINISH' if handled"
    )
    direct_response: str = Field(
        default="",
        description="Direct conversational response if choosing FINISH (e.g. greeting, help menu, or explanation)"
    )


async def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """
    Supervisor Agent evaluates user intent and orchestrates routing.
    """
    messages = list(state.get("messages", []))
    if not messages:
        return {"next": "FINISH"}

    # If OpenAI API key is provided, use structured LLM output
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=settings.openai_temperature,
                api_key=settings.openai_api_key
            )
            structured_router = llm.with_structured_output(SupervisorDecision, method="function_calling")

            prompt_messages = [
                SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
                SystemMessage(
                    content=f"Current user session: email={state.get('email', 'unknown')}, role={state.get('user_type', 'Resident')}"
                )
            ] + messages

            decision: SupervisorDecision = await structured_router.ainvoke(prompt_messages)

            updates: Dict[str, Any] = {"next": decision.next_agent}
            if decision.next_agent == "FINISH" and decision.direct_response:
                updates["messages"] = [AIMessage(content=decision.direct_response)]

            return updates
        except Exception:
            # Fallback to heuristic classification on API error
            pass

    # Heuristic fallback (fast & offline resilient)
    last_msg = messages[-1].content.lower() if messages[-1].content else ""

    booking_keywords = [
        "book", "booking", "hire", "schedule", "appointment", "reserve",
        "slot", "availability"
    ]
    if any(kw in last_msg for kw in booking_keywords):
        return {"next": "booking_agent"}

    community_keywords = [
        "post", "community", "feed", "notice", "announcement", "electric", "plumb",
        "carpenter", "clean", "ac", "repair", "service", "help", "publish", "share",
        "category", "details", "profile", "account", "who am i", "my posts"
    ]

    if any(kw in last_msg for kw in community_keywords):
        return {"next": "community_agent"}

    # General greeting or small talk
    if any(g in last_msg for g in ["hi", "hello", "hey", "good morning", "good evening", "help"]):
        greeting_text = (
            "Hello! I am your SuperBass Assistant. I can help you book service workers, "
            "browse community posts, or publish requests on the community board. What would you like to do today?"
        )
        return {
            "next": "FINISH",
            "messages": [AIMessage(content=greeting_text)]
        }

    # Default delegation to community agent
    return {"next": "community_agent"}
