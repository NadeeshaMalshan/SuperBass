"""
Support & Review Agent Node for Workio Multi-Agent System (Merged A+B).
Handles worker reviews, star ratings, dispute resolution, worker performance inquiries, and platform help.
"""

import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.support_review_tools import SUPPORT_REVIEW_TOOLS
from agent_backend.prompts.support_review_prompts import SUPPORT_REVIEW_SYSTEM_PROMPT
from agent_backend.utils.sanitizer import sanitize_messages_for_llm
from agent_backend.utils.card_builders import build_support_review_card

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
            temperature=0.2,
            api_key=settings.openai_api_key
        ).bind_tools(SUPPORT_REVIEW_TOOLS)

        response = await llm.ainvoke(prompt)
        result: Dict[str, Any] = {"messages": [response]}
        if not getattr(response, "tool_calls", None):
            # Final agent turn: directly produce structured AgentCardResponse (Architecture A)
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            result["structured_response"] = build_support_review_card(sim_state, ai_message=response)
        return result

    offline_msg = AIMessage(content="[Offline Mode] Support & Review Agent ready. Please configure OPENAI_API_KEY.")
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_support_review_card(sim_state, ai_message=offline_msg)
    }

