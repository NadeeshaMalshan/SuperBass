"""
Worker Matching Agent Node for Workio Multi-Agent System.
Specializes in discovering, filtering, evaluating performance, and recommending verified technicians.
"""

import logging
from datetime import datetime
import json
import re
from typing import Dict, Any, Optional, List
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.worker_matching_tools import WORKER_MATCHING_TOOLS
from agent_backend.tools.booking_tools import get_live_service_categories
from agent_backend.prompts.worker_matching_prompts import WORKER_MATCHING_SYSTEM_PROMPT
from agent_backend.schemas.card_models import (
    AgentCardResponse,
    WorkerListCard,
    WorkerSummary,
    UserProfileCard,
    TextMessageCard,
    ErrorCard
)
from agent_backend.utils.sanitizer import (
    sanitize_messages_for_llm,
    extract_text_content,
    clean_card_intro_message,
    normalize_skills,
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


def build_worker_matching_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Direct Tool-to-UI Card Mapper for Worker Matching Agent."""
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}
    user_name = metadata.get("user_name") or user_profile.get("displayName") or (email.split("@")[0] if "@" in email else "Resident")

    last_ai_content = ""
    if ai_message and hasattr(ai_message, "content") and ai_message.content:
        last_ai_content = extract_text_content(ai_message.content)
    else:
        for msg in reversed(messages):
            if getattr(msg, "type", "") == "ai" and msg.content:
                last_ai_content = extract_text_content(msg.content)
                break

    # Locate ToolMessage in current turn
    latest_tool: Optional[ToolMessage] = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
            break
        elif isinstance(msg, HumanMessage) or getattr(msg, "type", "") in ("human", "user"):
            break

    if latest_tool:
        tool_name = getattr(latest_tool, "name", "")
        raw_content = latest_tool.content
        data = {}
        if isinstance(raw_content, str):
            try:
                data = json.loads(raw_content)
            except Exception:
                data = {"raw": raw_content}
        elif isinstance(raw_content, dict):
            data = raw_content

        if isinstance(data, dict) and data.get("error"):
            return AgentCardResponse(
                response_type="error",
                message=last_ai_content or str(data.get("error")),
                card_data=ErrorCard(
                    errorCode="TOOL_EXECUTION_ERROR",
                    message=str(data.get("error")),
                    actionRequired="Please verify your input or check if the server is running."
                ).model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        if tool_name in ["get_user_details", "get_worker_details"]:
            card = UserProfileCard(
                email=data.get("email") or email,
                role=data.get("role") or "Worker",
                isWorker=True,
                displayName=data.get("displayName") or data.get("name") or user_name,
                phoneNo=data.get("phoneNo") or data.get("phoneNumber"),
                address=data.get("address") or data.get("primaryServiceArea") or "Colombo",
                workerRating=data.get("workerRating") or data.get("overallRating") or data.get("rating"),
                completedJobs=data.get("completedJobs"),
                skills=normalize_skills(data.get("skills")),
                pricingModel=data.get("pricingModel") or (f"LKR {data.get('hourlyRate')}/hr" if data.get('hourlyRate') else None)
            )
            clean_msg = clean_card_intro_message(
                last_ai_content,
                f"Here are the profile details for {card.displayName}:",
                "user_profile"
            )
            return AgentCardResponse(
                response_type="user_profile",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        if tool_name == "search_workers":
            raw_workers = data if isinstance(data, list) else (
                data.get("workers") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(raw_workers, list):
                raw_workers = []

            max_budget: Optional[float] = None
            for msg in reversed(messages):
                tool_calls = getattr(msg, "tool_calls", None) or []
                for tc in tool_calls:
                    if isinstance(tc, dict) and tc.get("name") == "search_workers":
                        args = tc.get("args") or {}
                        if args.get("maxHourlyRate") is not None:
                            try:
                                max_budget = float(args["maxHourlyRate"])
                                break
                            except Exception:
                                pass
                if max_budget is not None:
                    break

            if max_budget is None:
                for msg in reversed(messages):
                    if getattr(msg, "type", "") in ("human", "user"):
                        umsg = extract_text_content(getattr(msg, "content", "")).lower()
                        bmatch = re.search(r'(?:below|under|less than|max|budget)\s*(?:lkr\s*)?(\d+(?:\.\d+)?)', umsg)
                        if bmatch:
                            try:
                                max_budget = float(bmatch.group(1))
                            except Exception:
                                pass
                        break

            all_summaries: List[WorkerSummary] = []
            for item in raw_workers:
                if isinstance(item, dict):
                    raw_skills = item.get("skills") or []
                    all_summaries.append(
                        WorkerSummary(
                            id=item.get("id", 0),
                            name=item.get("name", "Verified Technician"),
                            rating=float(item.get("rating", 5.0) or 5.0),
                            hourlyRate=float(item.get("hourlyRate", 0.0) or 0.0),
                            skills=normalize_skills(raw_skills),
                            primaryServiceArea=item.get("primaryServiceArea") or "Colombo",
                            availability=item.get("availability") or "Available",
                            avatarUrl=item.get("avatarUrl") or item.get("profilePicture")
                        )
                    )

            if max_budget is not None and all_summaries:
                matching_workers = [w for w in all_summaries if w.hourlyRate <= max_budget]
                if not matching_workers:
                    min_avail = min((w.hourlyRate for w in all_summaries if w.hourlyRate > 0), default=0.0)
                    min_txt = f"{int(min_avail)}" if min_avail else "standard rates"
                    budg_txt = f"{int(max_budget)}"
                    msg = f"I couldn't find any technicians with an hourly rate of LKR {budg_txt} or below. The lowest available rate for this service starts at LKR {min_txt}/hr."
                    return AgentCardResponse(
                        response_type="text_message",
                        message=msg,
                        card_data=TextMessageCard(
                            text=msg,
                            suggestions=[f"Show technicians starting at LKR {min_txt}", "Create a Community Post", "Change search criteria"]
                        ).model_dump(),
                        metadata={"agent": "worker_matching_agent", "user_email": email}
                    )
                worker_summaries = matching_workers
            else:
                worker_summaries = all_summaries

            if not worker_summaries:
                msg = last_ai_content or "I couldn't find any technicians matching your search criteria."
                return AgentCardResponse(
                    response_type="text_message",
                    message=msg,
                    card_data=TextMessageCard(
                        text=msg,
                        suggestions=["Expand search area", "Create a Community Post", "View all categories"]
                    ).model_dump(),
                    metadata={"agent": "worker_matching_agent", "user_email": email}
                )

            card = WorkerListCard(
                category=str(metadata.get("inferred_category") or "All"),
                totalCount=len(worker_summaries),
                workers=worker_summaries
            )
            clean_msg = clean_card_intro_message(
                last_ai_content,
                f"Found {len(worker_summaries)} verified technicians near you:",
                "worker_list"
            )
            return AgentCardResponse(
                response_type="worker_list",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

    card = TextMessageCard(
        text=last_ai_content or "Here are verified technicians available for your request.",
        suggestions=["Book a technician", "Filter by price", "Create a Community Post"]
    )
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "worker_matching_agent", "user_email": email}
    )

