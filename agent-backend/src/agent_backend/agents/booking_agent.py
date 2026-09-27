from datetime import datetime
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.booking_tools import BOOKING_TOOLS
from agent_backend.prompts.booking_prompts import BOOKING_AGENT_SYSTEM_PROMPT

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

    prompt = [
        SystemMessage(
            content=BOOKING_AGENT_SYSTEM_PROMPT.format(
                email=email,
                user_address=user_address,
                user_phone=user_phone,
                location_info=location_info,
                current_time=current_time
            )
        )
    ] + messages

    if settings.openai_api_key and settings.openai_api_key !="your_openai_api_key_here":
        llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.2, # Low temperature for accurate slot filling
            api_key=settings.openai_api_key
        ).bind_tools(BOOKING_TOOLS)

        response = await llm.ainvoke(prompt)
        return {"messages": [response]}
    
    return {"messages": [AIMessage(content="[Offline Mode] Booking Agent ready. Please configure OPENAI_API_KEY.")]}