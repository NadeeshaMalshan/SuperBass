"""
Supervisor Agent Node for SuperBass Multi-Agent System.
Inspects incoming user messages using LLM natural language understanding (zero hardcoded keywords)
and orchestrates routing to the community_agent, booking_agent, or direct response.
"""

from typing import Dict, Any, Literal, Optional, List
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import logging
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.prompts.supervisor_prompts import SUPERVISOR_SYSTEM_PROMPT
from agent_backend.tools.booking_tools import get_live_service_categories
from agent_backend.utils.sanitizer import sanitize_messages_for_llm

logger = logging.getLogger("agent_backend.supervisor")


class SupervisorDecision(BaseModel):
    """Routing decision and natural language intent classification made by the LLM."""
    next_agent: Literal["community_agent", "booking_agent", "FINISH"] = Field(
        description="The next sub-agent to delegate the task to, or 'FINISH' if answered directly or asking a clarifying question"
    )
    inferred_category: Optional[str] = Field(
        default=None,
        description="The matching Workio service category from the official categories if a problem or service was described"
    )
    direct_response: str = Field(
        default="",
        description="Direct conversational response when choosing FINISH (e.g. greeting, problem summary with options, or explanation)"
    )
    suggested_actions: Optional[List[str]] = Field(
        default_factory=list,
        description="Dynamic action chips tailored by the LLM (e.g. ['Find a verified electrician', 'Create a community post'])"
    )


async def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """
    Supervisor Agent evaluates user intent and orchestrates routing using LLM natural language understanding.
    """
    messages = list(state.get("messages", []))
    if not messages:
        return {"next": "FINISH"}

    metadata = dict(state.get("metadata") or {})

    # Primary Path: LLM-powered dynamic intent classification & routing
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=settings.openai_temperature,
                api_key=settings.openai_api_key
            )
            structured_router = llm.with_structured_output(SupervisorDecision, method="function_calling")

            cats = await get_live_service_categories()
            categories_list = "\n".join(f"{idx+1}. {c}" for idx, c in enumerate(cats))
            formatted_prompt = SUPERVISOR_SYSTEM_PROMPT.format(categories_list=categories_list)

            clean_messages = sanitize_messages_for_llm(messages)
            prompt_messages = [
                SystemMessage(content=formatted_prompt),
                SystemMessage(
                    content=f"Current user session: email={state.get('email', 'unknown')}, role={state.get('user_type', 'Resident')}"
                )
            ] + clean_messages

            decision: SupervisorDecision = await structured_router.ainvoke(prompt_messages)
            logger.info(
                f"🧭 [Supervisor Routing] Agent: '{decision.next_agent}' | Inferred Category: '{decision.inferred_category}' | Actions: {decision.suggested_actions}"
            )

            updates: Dict[str, Any] = {"next": decision.next_agent}
            if decision.next_agent == "FINISH" and decision.direct_response:
                updates["messages"] = [AIMessage(content=decision.direct_response)]

            if decision.suggested_actions:
                # Strictly filter out tips, DIY, tutorials, and advice
                clean_actions = [
                    a for a in decision.suggested_actions
                    if not any(t in a.lower() for t in ["tip", "diy", "myself", "advice", "tutorial", "guide"])
                ]
                metadata["suggested_actions"] = clean_actions
            if decision.inferred_category:
                metadata["inferred_category"] = decision.inferred_category

            updates["metadata"] = metadata
            return updates
        except Exception as e:
            logger.warning(f"Supervisor LLM router error: {e}. Using offline fallback.")

    # Generic offline fallback (Zero hardcoded trade/category dictionaries; LLM handles categories when online)
    raw_text = messages[-1].content if messages[-1].content else ""
    lower_text = raw_text.lower()

    if any(w in lower_text for w in ["worker", "find a worker", "find worker", "book", "appointment", "schedule", "hire", "technician", "craftsman"]):
        return {"next": "booking_agent", "metadata": metadata}
    if any(w in lower_text for w in ["post", "community", "feed"]):
        return {"next": "community_agent", "metadata": metadata}

    default_chips = ["Find a service worker", "Create a community post"]
    metadata["suggested_actions"] = default_chips

    fallback_text = (
        f"I received your message: \"{raw_text.strip()}\".\n\n"
        f"How would you like to proceed?\n"
        f"1. **Find a Verified Worker** — Search and book an experienced professional in your area.\n"
        f"2. **Create a Community Post** — Share your service request on the community board for workers to reach out."
    )

    return {
        "next": "FINISH",
        "messages": [AIMessage(content=fallback_text)],
        "metadata": metadata
    }
