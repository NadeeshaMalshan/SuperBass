"""
Support & Review Agent Node for Workio Multi-Agent System (Merged A+B).
Handles worker reviews, star ratings, dispute resolution, worker performance inquiries, and platform help.
"""

import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.support_review_tools import SUPPORT_REVIEW_TOOLS
from agent_backend.prompts.support_review_prompts import SUPPORT_REVIEW_SYSTEM_PROMPT
from agent_backend.utils.sanitizer import sanitize_messages_for_llm
from agent_backend.utils.card_builders import (
    build_support_review_card,
    format_specialist_structured_message
)
from agent_backend.knowledge import get_formatted_policy_knowledge_base

from agent_backend.tools.mcp_client import mcp_client
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard

logger = logging.getLogger("agent_backend.support_review_agent")


async def support_review_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Support & Review Agent Node:
    Handles post-job ratings/reviews, dispute tickets, human escalation, and customer service inquiries.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_profile = state.get("user_profile") or {}
    metadata = dict(state.get("metadata") or {})

    # Proactively check real resident bookings to verify review eligibility
    user_bookings = []
    try:
        raw_b = await mcp_client.call_tool("get_resident_bookings", {"residentId": email, "upcomingOnly": False})
        if isinstance(raw_b, list):
            user_bookings = raw_b
        elif isinstance(raw_b, dict) and isinstance(raw_b.get("bookings"), list):
            user_bookings = raw_b.get("bookings", [])
    except Exception as e:
        logger.warning(f"Could not load resident bookings for {email}: {e}")

    completed_bookings = [
        b for b in user_bookings
        if isinstance(b, dict) and str(b.get("status", "")).strip().lower() in ["completed", "reviewed"]
    ]
    metadata["completed_bookings"] = completed_bookings

    # Identify user query
    user_query = ""
    for m in reversed(messages):
        if getattr(m, "type", "") == "human" or (hasattr(m, "content") and not getattr(m, "tool_calls", None) and getattr(m, "type", "") != "ai"):
            user_query = str(m.content or "")
            break
    user_query_lower = user_query.lower()

    has_tool_messages = any(
        getattr(m, "type", "") == "tool" or isinstance(m, ToolMessage)
        for m in messages
    )

    is_review_request = False
    if not has_tool_messages:
        is_asking_info = any(w in user_query_lower for w in [
            "what is", "what's", "how is", "show", "check", "who is", "tell me", "score"
        ])
        is_submitting_review = any(w in user_query_lower for w in [
            "i want to review", "want to review", "leave a review", "give a review", "submit a review",
            "write a review", "post a review", "review my", "rate my", "rate this", "rate the",
            "leave feedback", "give feedback", "how can i review", "review a worker", "review worker"
        ]) or user_query_lower.strip() in ["review", "reviews", "leave review", "give review", "rate", "rating"]

        if is_submitting_review and not is_asking_info:
            is_review_request = True

    # If the resident explicitly asks to review workers, but has NO completed bookings:
    if is_review_request and not completed_bookings:
        no_booking_msg = "You don't have any completed bookings to review workers yet. Once a technician completes your scheduled service, you can leave ratings and feedback here."
        ai_msg = AIMessage(content=no_booking_msg)
        sim_state = dict(state)
        sim_state["messages"] = messages + [ai_msg]
        sim_state["metadata"] = metadata
        card = TextMessageCard(
            text=no_booking_msg,
            suggestions=["Find a service worker", "View my bookings", "Book a technician"]
        )
        return {
            "messages": [ai_msg],
            "metadata": metadata,
            "structured_response": AgentCardResponse(
                response_type="text_message",
                message=no_booking_msg,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )
        }

    # Format completed bookings info for prompt
    if completed_bookings:
        completed_bookings_summary = "Eligible Completed Bookings for Review:\n" + "\n".join([
            f"- Booking #{b.get('id')}: Worker '{b.get('workerName', 'Technician')}' (Worker ID: {b.get('workerId')}) for '{b.get('jobTitle', 'Home Service')}'"
            for b in completed_bookings
        ])
    else:
        completed_bookings_summary = "Eligible Completed Bookings for Review: NONE. (Resident has no completed bookings. If they ask to review, inform them they have no completed bookings)."

    clean_messages = sanitize_messages_for_llm(messages)
    prompt = [
        SystemMessage(
            content=SUPPORT_REVIEW_SYSTEM_PROMPT.format(
                email=email,
                user_profile=user_profile,
                completed_bookings_summary=completed_bookings_summary,
                policy_knowledge_base=get_formatted_policy_knowledge_base()
            )
        )
    ] + clean_messages

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        logger.info(f"⭐ [Support & Review Agent] Executing LLM with tools for '{email}'")
        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key
        ).bind_tools(SUPPORT_REVIEW_TOOLS)

        response = await llm.ainvoke(prompt)
        result: Dict[str, Any] = {"messages": [response], "metadata": metadata}
        if not getattr(response, "tool_calls", None):
            # Final agent turn: enforce Pydantic Structured Output on conversational message
            response = await format_specialist_structured_message(prompt, response, llm=llm, agent_type="support_review_agent")
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            sim_state["metadata"] = metadata
            result["messages"] = [response]
            result["structured_response"] = build_support_review_card(sim_state, ai_message=response)
        return result

    offline_msg = AIMessage(content="[Offline Mode] Support & Review Agent ready. Please configure OPENAI_API_KEY.")
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    sim_state["metadata"] = metadata
    return {
        "messages": [offline_msg],
        "metadata": metadata,
        "structured_response": build_support_review_card(sim_state, ai_message=offline_msg)
    }


