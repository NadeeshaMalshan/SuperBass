"""
Worker Matching Agent Node for Workio Multi-Agent System.
Specializes in discovering, filtering, evaluating performance, and recommending verified technicians.
"""

import logging
from datetime import datetime
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.worker_matching_tools import WORKER_MATCHING_TOOLS
from agent_backend.tools.booking_tools import get_live_service_categories
from agent_backend.prompts.worker_matching_prompts import WORKER_MATCHING_SYSTEM_PROMPT
from agent_backend.utils.sanitizer import sanitize_messages_for_llm
from agent_backend.utils.card_builders import (
    build_worker_matching_card,
    format_specialist_structured_message
)


logger = logging.getLogger("agent_backend.worker_matching_agent")


async def worker_matching_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Worker Matching Agent Node:
    Searches, compares, and recommends verified local technicians using proximity ranking and performance metrics.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}

    # Extract user coordinates and location
    user_lat = metadata.get("user_lat")
    user_lng = metadata.get("user_lng")
    user_loc = metadata.get("location") or metadata.get("user_location_name")

    if (user_lat is None or user_lng is None) and isinstance(user_profile.get("resident"), dict):
        res_dict = user_profile["resident"]
        if res_dict.get("locationLat") and res_dict.get("locationLng"):
            user_lat = res_dict["locationLat"]
            user_lng = res_dict["locationLng"]

    if not user_loc and user_profile.get("address"):
        user_loc = user_profile["address"]

    loc_parts = []
    if user_loc:
        loc_parts.append(f"City/Address: {user_loc}")
    if user_lat is not None and user_lng is not None:
        loc_parts.append(f"GPS: ({user_lat}, {user_lng})")

    location_info = ", ".join(loc_parts) if loc_parts else "Colombo (Default: 6.9271, 79.8612)"
    user_address = user_profile.get("address") or user_loc or "Colombo, Sri Lanka"
    user_phone = user_profile.get("phoneNo") or "on file"
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

    live_cats = await get_live_service_categories()
    categories_list = "\n".join(f"{idx+1}. {c}" for idx, c in enumerate(live_cats))

    clean_messages = sanitize_messages_for_llm(messages)
    prompt = [
        SystemMessage(
            content=WORKER_MATCHING_SYSTEM_PROMPT.format(
                email=email,
                user_address=user_address,
                user_phone=user_phone,
                location_info=location_info,
                current_time=current_time,
                categories_list=categories_list
            )
        )
    ] + clean_messages

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        logger.info(f"🔍 [Worker Matching Agent] Executing LLM with tools for '{email}'")
        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key
        ).bind_tools(WORKER_MATCHING_TOOLS)

        response = await llm.ainvoke(prompt)
        result: Dict[str, Any] = {"messages": [response]}
        if not getattr(response, "tool_calls", None):
            # Final agent turn: enforce Pydantic Structured Output on conversational message
            response = await format_specialist_structured_message(prompt, response, llm=llm)
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            result["messages"] = [response]
            result["structured_response"] = build_worker_matching_card(sim_state, ai_message=response)
        return result

    offline_msg = AIMessage(content="[Offline Mode] Worker Matching Agent ready. Please configure OPENAI_API_KEY.")
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_worker_matching_card(sim_state, ai_message=offline_msg)
    }

