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
from agent_backend.utils.sanitizer import sanitize_messages_for_llm


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

            clean_messages = sanitize_messages_for_llm(messages)
            prompt_messages = [
                SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
                SystemMessage(
                    content=f"Current user session: email={state.get('email', 'unknown')}, role={state.get('user_type', 'Resident')}"
                )
            ] + clean_messages

            decision: SupervisorDecision = await structured_router.ainvoke(prompt_messages)

            updates: Dict[str, Any] = {"next": decision.next_agent}
            if decision.next_agent == "FINISH" and decision.direct_response:
                updates["messages"] = [AIMessage(content=decision.direct_response)]

            return updates
        except Exception:
            # Fallback to heuristic classification on API error
            pass

    # Heuristic fallback (fast & offline resilient)
    raw_last_text = messages[-1].content if messages[-1].content else ""
    last_msg = raw_last_text.lower()

    # 1. Explicit worker search or booking
    booking_keywords = [
        "book", "booking", "hire", "schedule", "appointment", "reserve",
        "slot", "availability", "find a worker", "find worker", "find electrician",
        "find plumber", "find technician", "find carpenter", "find painter", "find cleaner",
        "find craftsman"
    ]
    if any(kw in last_msg for kw in booking_keywords):
        return {"next": "booking_agent"}

    # 2. Explicit community post or feed management
    community_keywords = [
        "post", "community", "feed", "notice", "announcement", "publish", "share",
        "my posts", "create post", "make a post"
    ]
    if any(kw in last_msg for kw in community_keywords):
        return {"next": "community_agent"}

    # 3. General greeting or small talk
    if any(g in last_msg for g in ["hi", "hello", "hey", "good morning", "good evening", "help"]):
        greeting_text = (
            "Hello! I am your Workio Assistant. I can help you find verified workers, "
            "browse community posts, or publish requests on the community board. What would you like to do today?"
        )
        return {
            "next": "FINISH",
            "messages": [AIMessage(content=greeting_text)]
        }

    # 4. Service problem or issue description without explicit action
    issue_keywords = [
        "electric", "wire", "wiring", "plumb", "leak", "tap", "pipe", "drain",
        "ac", "air condition", "cool", "carpent", "wood", "door", "furniture",
        "paint", "clean", "messy", "broken", "fix", "repair", "not working", "damaged"
    ]
    if any(kw in last_msg for kw in issue_keywords):
        trade = "Service Worker"
        if any(w in last_msg for w in ["electric", "wire", "wiring", "light", "switch", "power"]):
            trade = "Electrician"
        elif any(w in last_msg for w in ["plumb", "leak", "tap", "pipe", "drain", "water"]):
            trade = "Plumber"
        elif any(w in last_msg for w in ["ac", "air condition", "cool"]):
            trade = "AC Technician"
        elif any(w in last_msg for w in ["carpent", "wood", "door", "furniture"]):
            trade = "Carpenter"
        elif any(w in last_msg for w in ["paint", "color", "wall"]):
            trade = "Painter"
        elif any(w in last_msg for w in ["clean", "wash"]):
            trade = "Cleaner"

        loc = state.get("user_profile", {}).get("address") or state.get("metadata", {}).get("location") or "Colombo"
        choice_text = (
            f"I understand you have an issue with {trade.lower()} work: \"{raw_last_text.strip()}\".\n\n"
            f"How would you like to proceed?\n"
            f"1. **Find a Verified {trade}** — Search and book an experienced, rated professional in {loc} right now.\n"
            f"2. **Create a Community Post** — Publish your service request on the community board so local technicians can view it and reach out."
        )
        return {
            "next": "FINISH",
            "messages": [AIMessage(content=choice_text)]
        }

    # Default delegation to community agent
    return {"next": "community_agent"}
