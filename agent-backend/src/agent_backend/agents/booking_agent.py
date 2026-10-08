import logging
import json
import re
from datetime import datetime
from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.booking_tools import BOOKING_TOOLS, get_live_service_categories, create_booking
from agent_backend.prompts.booking_prompts import BOOKING_AGENT_SYSTEM_PROMPT
from agent_backend.schemas.card_models import (
    BookingConfirmationReviewCard,
    TextMessageCard,
    AgentCardResponse
)
from agent_backend.utils.sanitizer import sanitize_messages_for_llm, extract_text_content
from agent_backend.utils.card_builders import (
    build_booking_card,
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
    user_phone = user_profile.get("phoneNo") or "0771234567"
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

    last_user_text = ""
    for m in reversed(messages):
        if getattr(m, "type", "") in ("human", "user"):
            last_user_text = extract_text_content(getattr(m, "content", ""))
            break

    booking_data = metadata.get("booking_data") or {}

    # -------------------------------------------------------------------------
    # 0A. Booking Request Cancellation
    # User clicked "No, Cancel" on the confirmation review card
    # -------------------------------------------------------------------------
    is_cancel_action = (
        last_user_text.upper().startswith("CANCEL_BOOKING")
        or metadata.get("action") == "cancel_booking_request"
    )
    if is_cancel_action:
        cancel_msg = (
            "Your booking request has been cancelled. No appointment was created. "
            "Please let me know if you would like to select another technician or adjust the booking details!"
        )
        ai_msg = AIMessage(content=cancel_msg)
        text_card = TextMessageCard(
            text=cancel_msg,
            suggestions=[
                "Find another verified technician",
                "Show my community posts",
                "Ask a question"
            ]
        )
        card_resp = AgentCardResponse(
            response_type="text_message",
            message=cancel_msg,
            card_data=text_card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email}
        )
        return {
            "messages": [ai_msg],
            "structured_response": card_resp
        }

    # -------------------------------------------------------------------------
    # 0B. Two-Step Human Verification: Review Summary Card
    # User submitted the booking form and needs to see the final confirmation card
    # with explicit Yes/No buttons before database persistence.
    # -------------------------------------------------------------------------
    is_review_action = (
        last_user_text.upper().startswith("REVIEW_BOOKING")
        or metadata.get("action") == "review_booking"
    )
    if is_review_action and (booking_data or "worker" in last_user_text.lower()):
        worker_id_val = str(booking_data.get("workerId") or "")
        if not worker_id_val:
            w_match = re.search(r'worker\s*(?:id)?\s*#?\s*(\d+)', last_user_text, re.IGNORECASE)
            if w_match:
                worker_id_val = w_match.group(1)
            else:
                worker_id_val = "1"

        worker_name_val = booking_data.get("workerName") or "Technician"
        worker_avatar_val = booking_data.get("workerAvatar")
        cat_val = booking_data.get("category") or "Home Service"
        job_title_val = booking_data.get("jobTitle") or f"{cat_val} Service Request"
        scheduled_date_val = str(booking_data.get("scheduledDate") or booking_data.get("date") or "")
        if not scheduled_date_val:
            d_match = re.search(r'on\s*(\d{4}-\d{2}-\d{2})', last_user_text)
            if d_match:
                scheduled_date_val = d_match.group(1)
            else:
                scheduled_date_val = (datetime.now()).strftime("%Y-%m-%d")

        location_val = booking_data.get("locationAddress") or user_address
        phone_val = booking_data.get("contactPhone") or user_phone
        notes_val = booking_data.get("notes") or ""
        rate_val = float(booking_data.get("hourlyRate") or 2800)
        est_price_val = float(booking_data.get("estimatedPrice") or rate_val)

        review_card = BookingConfirmationReviewCard(
            workerId=worker_id_val,
            workerName=worker_name_val,
            workerAvatar=worker_avatar_val,
            category=cat_val,
            jobTitle=job_title_val,
            scheduledDate=scheduled_date_val,
            locationAddress=location_val,
            contactPhone=phone_val,
            hourlyRate=rate_val,
            estimatedPrice=est_price_val,
            notes=notes_val,
            confirmPrompt=f"CONFIRM_BOOKING: Yes, please book worker ID {worker_id_val} ({worker_name_val}) for {scheduled_date_val}. Service: {job_title_val}. Location: {location_val}. Phone: {phone_val}. Notes: {notes_val}",
            cancelPrompt=f"CANCEL_BOOKING: Cancel this booking request with {worker_name_val}."
        )

        review_msg = f"I've prepared the booking confirmation for {worker_name_val}. Please review the details below and confirm if you want to proceed:"
        ai_msg = AIMessage(content=review_msg)
        card_resp = AgentCardResponse(
            response_type="booking_confirmation",
            message=review_msg,
            card_data=review_card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email, "workerId": worker_id_val}
        )
        return {
            "messages": [ai_msg],
            "structured_response": card_resp
        }

    # -------------------------------------------------------------------------
    # 0C. Deterministic Booking Creation on User "YES" Click
    # When the user explicitly clicks 'Yes, Confirm Booking', execute create_booking.
    # -------------------------------------------------------------------------
    is_confirm_action = (
        last_user_text.upper().startswith("CONFIRM_BOOKING")
        or metadata.get("action") in ("create_booking", "confirm_booking")
    )

    if is_confirm_action:
        worker_id_val = str(booking_data.get("workerId") or "")
        scheduled_date_val = str(booking_data.get("scheduledDate") or booking_data.get("date") or "")
        job_title_val = booking_data.get("jobTitle") or "Service Appointment"
        location_val = booking_data.get("locationAddress") or user_address
        phone_val = booking_data.get("contactPhone") or user_phone
        notes_val = booking_data.get("notes") or "Standard booking request via Workio AI"

        # If workerId wasn't in booking_data, extract from prompt
        if not worker_id_val:
            w_match = re.search(r'worker\s*(?:id)?\s*#?\s*(\d+)', last_user_text, re.IGNORECASE)
            if w_match:
                worker_id_val = w_match.group(1)

        # Parse date from prompt if needed
        if not scheduled_date_val:
            d_match = re.search(r'for\s*(\d{4}-\d{2}-\d{2})', last_user_text)
            if d_match:
                scheduled_date_val = f"{d_match.group(1)}T09:00:00"

        start_time_val = scheduled_date_val or f"{datetime.now().strftime('%Y-%m-%d')}T09:00:00"
        end_time_val = start_time_val.replace("T09:00:00", "T11:00:00") if "T09:" in start_time_val else start_time_val

        logger.info(
            f"⚡ [Booking Agent] Executing deterministic booking creation for Worker #{worker_id_val} by '{email}'"
        )

        try:
            booking_tool_res = await create_booking.ainvoke({
                "workerId": str(worker_id_val),
                "residentId": str(email),
                "startTime": start_time_val,
                "endTime": end_time_val,
                "jobTitle": job_title_val,
                "locationAddress": location_val,
                "contactPhone": phone_val,
                "notes": notes_val,
            })

            tool_msg = ToolMessage(
                content=json.dumps(booking_tool_res),
                name="create_booking",
                tool_call_id="call_create_booking_confirm"
            )
            worker_name_val = booking_data.get("workerName") or booking_tool_res.get("workerName") or "Technician"
            b_id_val = booking_tool_res.get("id") or booking_tool_res.get("bookingId") or "new"
            confirm_ai_text = f"Your appointment with {worker_name_val} has been successfully scheduled! Booking #{b_id_val}."
            ai_msg = AIMessage(content=confirm_ai_text)

            sim_state = dict(state)
            sim_state["messages"] = messages + [tool_msg, ai_msg]
            if "metadata" not in sim_state or not sim_state["metadata"]:
                sim_state["metadata"] = {}
            sim_state["metadata"]["agent"] = "booking_agent"

            structured_resp = build_booking_card(sim_state, ai_message=ai_msg)
            return {
                "messages": [tool_msg, ai_msg],
                "structured_response": structured_resp,
            }
        except Exception as e:
            logger.error(f"❌ [Booking Agent] Deterministic booking execution failed: {e}", exc_info=True)

    # -------------------------------------------------------------------------
    # Standard LLM Turn with Booking Tools
    # -------------------------------------------------------------------------
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

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        logger.info(f"🛠️ [Booking Agent] Executing LLM with tools for '{email}' (location: {location_info})")
        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key
        ).bind_tools(BOOKING_TOOLS)

        response = await llm.ainvoke(prompt)
        result: Dict[str, Any] = {"messages": [response]}
        if not getattr(response, "tool_calls", None):
            response = await format_specialist_structured_message(prompt, response, llm=llm, agent_type="booking_agent")
            sim_state = dict(state)
            sim_state["messages"] = messages + [response]
            if "metadata" not in sim_state or not sim_state["metadata"]:
                sim_state["metadata"] = {}
            sim_state["metadata"]["agent"] = "booking_agent"
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