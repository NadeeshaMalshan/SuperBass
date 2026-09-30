"""
Support & Review Agent Node for Workio Multi-Agent System (Merged A+B).
Handles worker reviews, star ratings, dispute resolution, worker performance inquiries, and platform help.
"""

import logging
import json
from typing import Dict, Any, Optional
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.support_review_tools import SUPPORT_REVIEW_TOOLS
from agent_backend.prompts.support_review_prompts import SUPPORT_REVIEW_SYSTEM_PROMPT
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard
from agent_backend.utils.sanitizer import (
    sanitize_messages_for_llm,
    extract_text_content,
    format_specialist_structured_message
)

logger = logging.getLogger("agent_backend.support_review_agent")


async def support_review_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Support & Review Agent Node:
    Handles post-job ratings/reviews, dispute tickets, human escalation, and customer service inquiries.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_profile = state.get("user_profile") or {}

    clean_messages = sanitize_messages_for_llm(messages)
    prompt = [
        SystemMessage(
            content=SUPPORT_REVIEW_SYSTEM_PROMPT.format(
                email=email,
                user_profile=user_profile
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
        result: Dict[str, Any] = {"messages": [response]}
        if not getattr(response, "tool_calls", None):
            # Final agent turn: enforce Pydantic Structured Output on conversational message
            response = await format_specialist_structured_message(prompt, response, llm=llm)
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            result["messages"] = [response]
            result["structured_response"] = build_support_review_card(sim_state, ai_message=response)
        return result

    offline_msg = AIMessage(content="[Offline Mode] Support & Review Agent ready. Please configure OPENAI_API_KEY.")
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_support_review_card(sim_state, ai_message=offline_msg)
    }


def build_support_review_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Direct Tool-to-UI Card Mapper for Support & Review Agent."""
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    last_ai_content = ""
    if ai_message and hasattr(ai_message, "content") and ai_message.content:
        last_ai_content = extract_text_content(ai_message.content)
    else:
        for msg in reversed(messages):
            if getattr(msg, "type", "") == "ai" and msg.content:
                last_ai_content = extract_text_content(msg.content)
                break

    latest_tool: Optional[ToolMessage] = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
            break
        elif isinstance(msg, HumanMessage) or getattr(msg, "type", "") in ("human", "user"):
            break

    tool_name = getattr(latest_tool, "name", "") if latest_tool else ""
    raw_content = latest_tool.content if latest_tool else "{}"
    data = {}
    if isinstance(raw_content, str):
        try:
            data = json.loads(raw_content)
        except Exception:
            data = {"raw": raw_content}
    elif isinstance(raw_content, dict):
        data = raw_content

    suggestions = ["Leave a review", "Contact human support", "Return to home"]
    if tool_name == "create_worker_review":
        suggestions = ["Book another service", "View community feed"]

    msg = last_ai_content
    if not msg:
        if tool_name == "create_worker_review":
            msg = "Your review has been successfully submitted and recorded. Thank you for your feedback!"
        elif tool_name == "file_dispute_ticket":
            ticket_id = data.get("ticketId") or data.get("id") or ""
            msg = f"Dispute ticket #{ticket_id} has been submitted to support." if ticket_id else "Dispute ticket submitted."
        else:
            msg = f"Support action {tool_name} completed." if tool_name else "How can I assist you with support, reviews, or disputes?"

    card = TextMessageCard(
        text=msg,
        suggestions=suggestions
    )
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "support_review_agent", "user_email": email}
    )

