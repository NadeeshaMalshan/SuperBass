import logging
from datetime import datetime
import json
from typing import Dict, Any, Optional
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.booking_tools import BOOKING_TOOLS, get_live_service_categories
from agent_backend.prompts.booking_prompts import BOOKING_AGENT_SYSTEM_PROMPT
from agent_backend.schemas.card_models import AgentCardResponse, TextMessageCard
from agent_backend.utils.sanitizer import (
    sanitize_messages_for_llm,
    extract_text_content,
    format_specialist_structured_message
)

logger = logging.getLogger("agent_backend.booking_agent")


async def booking_agent_node(state: AgentState) -> Dict[str, Any]:
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

    # Fetch dynamic live service categories via MCP
    live_cats = await get_live_service_categories()
    categories_list = "\n".join(f"{idx+1}. {c}" for idx, c in enumerate(live_cats))

    clean_messages = sanitize_messages_for_llm(messages)
    prompt = [
        SystemMessage(
            content=BOOKING_AGENT_SYSTEM_PROMPT.format(
                email=email,
                user_address=user_address,
                user_phone=user_phone,
                location_info=location_info,
                current_time=current_time,
                categories_list=categories_list
            )
        )
    ] + clean_messages

    if settings.openai_api_key and settings.openai_api_key !="your_openai_api_key_here":
        logger.info(f"🛠️ [Booking Agent] Executing LLM with tools for '{email}' (location: {location_info})")
        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key
        ).bind_tools(BOOKING_TOOLS)

        response = await llm.ainvoke(prompt)
        result: Dict[str, Any] = {"messages": [response]}
        if not getattr(response, "tool_calls", None):
            # Final agent turn: enforce Pydantic Structured Output on conversational message
            response = await format_specialist_structured_message(prompt, response, llm=llm)
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            result["messages"] = [response]
            result["structured_response"] = build_booking_card(sim_state, ai_message=response)
        return result
    
    offline_msg = AIMessage(content="[Offline Mode] Booking Agent ready. Please configure OPENAI_API_KEY.")
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_booking_card(sim_state, ai_message=offline_msg)
    }


def build_booking_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Direct Tool-to-UI Card Mapper for Booking Agent."""
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

    suggestions = ["Book a technician", "View upcoming bookings", "Cancel a booking"]
    if tool_name == "create_booking":
        suggestions = ["View booking details", "Browse community feed"]

    msg = last_ai_content
    if not msg:
        booking_id = data.get("bookingId") or data.get("id") or ""
        if tool_name == "reschedule_booking":
            msg = f"Booking #{booking_id} has been successfully rescheduled." if booking_id else "Booking has been rescheduled."
        elif tool_name == "cancel_booking":
            msg = f"Booking #{booking_id} has been cancelled." if booking_id else "Booking has been cancelled."
        elif tool_name == "create_booking":
            msg = f"Booking #{booking_id} has been confirmed." if booking_id else "Your booking has been confirmed."
        else:
            msg = f"Booking action {tool_name} completed." if tool_name else "How can I help you with service bookings?"

    card = TextMessageCard(
        text=msg,
        suggestions=suggestions
    )
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "booking_agent", "user_email": email}
    )