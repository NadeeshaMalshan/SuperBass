"""
Community Specialist Agent Node for Workio Multi-Agent System.
Equipped with MCP community tools and user profile tools.
"""

import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.community_tools import COMMUNITY_TOOLS
from agent_backend.prompts.community_prompts import COMMUNITY_AGENT_SYSTEM_PROMPT
from agent_backend.utils.sanitizer import sanitize_messages_for_llm
from agent_backend.utils.card_builders import (
    build_community_card,
    format_specialist_structured_message
)

logger = logging.getLogger("agent_backend.community_agent")


async def community_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Community Agent processes user queries using MCP community and user tools.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}
    user_name = metadata.get("user_name") or user_profile.get("displayName") or (email.split("@")[0] if "@" in email else "Resident")
    user_location = metadata.get("location") or user_profile.get("address") or "Colombo"

    system_instruction = COMMUNITY_AGENT_SYSTEM_PROMPT.format(
        email=email,
        user_type=user_type,
        user_name=user_name,
        user_location=user_location
    )

    clean_messages = sanitize_messages_for_llm(messages)
    prompt_messages = [SystemMessage(content=system_instruction)] + clean_messages

    # If OpenAI API Key is valid, use gpt-4o-mini with tool bindings
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            logger.info(f"📢 [Community Agent] Executing LLM with tools for user '{email}' ({user_type})")
            llm = ChatOpenAI(
                model=settings.openai_model,
                api_key=settings.openai_api_key
            )
            llm_with_tools = llm.bind_tools(COMMUNITY_TOOLS)
            response = await llm_with_tools.ainvoke(prompt_messages)
            result: Dict[str, Any] = {"messages": [response]}
            if not getattr(response, "tool_calls", None):
                # Final agent turn: enforce Pydantic Structured Output on conversational message
                response = await format_specialist_structured_message(prompt_messages, response, llm=llm)
                sim_state = dict(state)
                sim_state["messages"] = messages + [response]
                result["messages"] = [response]
                result["structured_response"] = build_community_card(sim_state, ai_message=response)
            return result
        except Exception as e:
            error_msg = f"Error in Community Agent: {str(e)}"
            err_ai = AIMessage(content=error_msg)
            sim_state = dict(state)
            sim_state["messages"] = messages + [err_ai]
            return {
                "messages": [err_ai],
                "structured_response": build_community_card(sim_state, ai_message=err_ai)
            }

    # Offline / Test fallback when API key is not yet set
    last_text = messages[-1].content if messages else ""
    offline_msg = AIMessage(
        content=f"[Offline Mode] Received request for community posts: '{last_text}'. "
                f"Active user: {email} ({user_type}). "
                f"Please configure OPENAI_API_KEY to enable live MCP tool execution."
    )
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_community_card(sim_state, ai_message=offline_msg)
    }

