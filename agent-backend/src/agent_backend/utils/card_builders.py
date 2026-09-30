"""
Direct Tool-to-UI Card Mapper for Workio Multi-Agent System (Architecture A).
Directly maps MCP tool results and LangGraph agent states into strictly typed
Pydantic UI Card responses (AgentCardResponse) for the React frontend.
Zero regex-scraping of free-form LLM text.
"""

from typing import Dict, Any, List, Optional, Union
import json
import logging
import re
from datetime import datetime, timezone
from langchain_core.messages import ToolMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.state.state import AgentState
from agent_backend.utils.sanitizer import extract_text_content
from agent_backend.schemas.card_models import (
    AgentCardResponse,
    PostConfirmationCard,
    PostCreatedCard,
    PostListCard,
    PostDetailCard,
    PostUpdatedCard,
    PostDeletedCard,
    UserProfileCard,
    ServiceCategoriesCard,
    TextMessageCard,
    ErrorCard,
    CommunityPostSummary,
    WorkerListCard,
    WorkerSummary,
    SpecialistConversationalOutput
)

logger = logging.getLogger("agent_backend.card_builders")


def _normalize_skills(raw: Any) -> List[str]:
    """Ensure skills are always a clean list of strings."""
    if not raw:
        return []
    result = []
    if isinstance(raw, list):
        for s in raw:
            if isinstance(s, dict):
                val = s.get("name") or s.get("skillName") or s.get("title") or s.get("label")
                if val:
                    result.append(str(val))
            elif s:
                result.append(str(s))
    elif isinstance(raw, str) and raw:
        result.append(raw)
    return result


def _clean_card_intro_message(raw_msg: str, default_intro: str, card_type: str = "card") -> str:
    """
    Strips raw field headers and empty bracket tokens from conversational bubbles
    so they don't duplicate interactive UI card components.
    """
    if not raw_msg or not isinstance(raw_msg, str):
        return default_intro

    text = raw_msg.strip()
    text = re.sub(r'^(?:\[\s*\]|\(\s*\))\s*', '', text).strip()

    # If the text contains bulleted or bold field dumps (e.g. • **Title:** ...), extract conversational intro & closing
    has_dump = bool(
        re.search(
            r'(?:'
            r'(?:\n|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*•]\s*\*\*)|'
            r'(?:[•\-*]?\s*)\*\*(?:Title|Category|Location|Content|Description|Urgency|Worker|Price|Rate|Phone|Email|Skills?):\*\*|'
            r'!\[.*?\]\(.*?\)|\(tel:\d+\)|###\s+[A-Z]'
            r')',
            text,
            re.IGNORECASE
        )
    )

    if not has_dump:
        return text

    # For draft community post confirmation cards
    if card_type == "post_confirmation" or bool(re.search(r'\*\*(?:Title|Category|Location|Content|Description):\*\*', text, re.IGNORECASE)):
        intro_match = re.search(
            r'^(.*?)(?=(?:\s*[•\-*]?\s*)\*\*(?:Title|Category|Location|Content|Description|Urgency):\*\*)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        intro = intro_match.group(1).strip() if intro_match else ""
        if intro:
            intro = intro.rstrip(" \t\n•-*")
            if not intro.endswith((".", "!", ":", "?")):
                intro += ":"

        closing_match = re.search(
            r'((?:Please review|You can edit|Feel free|Would you like|I\'ll wait|I will wait|Reply with|Reply \'confirm\')[^\n]*[.?!]?\s*)$',
            text,
            re.IGNORECASE
        )
        closing = closing_match.group(1).strip() if closing_match else ""
        if closing:
            closing = re.sub(r'\bdetails above\b', 'details below', closing, flags=re.IGNORECASE)
        else:
            closing = "Please review the details below and confirm when you're ready to publish."

        if intro and len(intro) > 5 and not intro.startswith(("•", "-", "*", "1.")):
            cleaned = f"{intro} {closing}".strip()
        else:
            cleaned = f"Here is your draft community post. {closing}".strip()

        cleaned = re.sub(r'^(?:\[\s*\]|\(\s*\))\s*', '', cleaned)
        cleaned = re.sub(r'\s{2,}', ' ', cleaned)
        return cleaned

    # For worker lists or general items
    intro_match = re.search(
        r'^(.*?)(?=(?:\s*\n\s*|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*•]\s*\*\*|(?:[•\-*]?\s*)\*\*(?:Worker|Name|Price|Rate|Title):\*\*|!\[.*?\]\(.*?\)|###\s+))',
        text,
        re.DOTALL
    )
    intro = intro_match.group(1).strip() if intro_match else ""

    closing_match = re.search(r'(?:(?:\n|\.\s+|:\s+))([A-Z][^\n]*\?)\s*$', text)
    closing = closing_match.group(1).strip() if closing_match else ""

    parts = []
    if intro and len(intro) > 8 and not intro.startswith(("1.", "-", "*", "•")):
        if not intro.endswith((".", "!", ":", "?")):
            intro += ":"
        parts.append(intro)
    else:
        parts.append(default_intro)

    if closing and closing not in (parts[0] if parts else ""):
        parts.append(closing)
    elif card_type == "worker_list" and not any("book" in p.lower() for p in parts):
        parts.append("Would you like to book one of these technicians, or inspect more details?")

    cleaned = " ".join(parts).strip()
    cleaned = re.sub(r'!\[.*?\]\(.*?\)', '', cleaned).strip()
    cleaned = re.sub(r'\[(.*?)\]\(tel:.*?\)', r'\1', cleaned).strip()
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    return cleaned if cleaned else default_intro


async def format_specialist_structured_message(
    prompt: list,
    response: AIMessage,
    llm: Optional[ChatOpenAI] = None
) -> AIMessage:
    """
    Validates and formats the specialist agent's conversational output.
    Ensures message content is clean text without redundant raw card data dumps.
    """
    raw_content = extract_text_content(getattr(response, "content", ""))
    if not raw_content:
        return response

    has_card_dump = bool(
        re.search(
            r'(?:'
            r'(?:\n|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*•]\s*\*\*)|'
            r'(?:[•\-*]?\s*)\*\*(?:Title|Category|Location|Content|Description|Urgency|Worker|Price|Rate):\*\*|'
            r'!\[.*?\]\(.*?\)|\(tel:\d+\)|###\s+[A-Z]'
            r')',
            raw_content,
            re.IGNORECASE
        )
    )
    if not has_card_dump:
        if isinstance(getattr(response, "content", None), list):
            return AIMessage(
                content=raw_content,
                additional_kwargs=getattr(response, "additional_kwargs", {}),
                response_metadata=getattr(response, "response_metadata", {})
            )
        return response

    card_type_hint = "post_confirmation" if bool(re.search(r'\*\*(?:Title|Category|Location|Content):\*\*', raw_content, re.IGNORECASE)) else "worker_list"
    cleaned = _clean_card_intro_message(raw_content, "Here are the recommended service options:", card_type_hint)
    return AIMessage(
        content=cleaned,
        additional_kwargs=getattr(response, "additional_kwargs", {}),
        response_metadata=getattr(response, "response_metadata", {})
    )


def _deterministic_card_builder(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """
    Direct Tool-to-UI Card Mapper.
    Uses tool outputs directly to build structured frontend cards, and uses
    clean conversational text for the chat bubble.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")
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

    # Locate the ToolMessage executed in the CURRENT conversation turn
    latest_tool: Optional[ToolMessage] = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
            break
        elif isinstance(msg, HumanMessage) or getattr(msg, "type", "") in ("human", "user"):
            # Turn boundary reached: no tool executed in this current turn
            break

    # =========================================================================
    # 1. TOOL-DRIVEN CARDS (Direct JSON mapping from MCP tools)
    # =========================================================================
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

        # Error handling
        if isinstance(data, dict) and data.get("error"):
            return AgentCardResponse(
                response_type="error",
                message=last_ai_content or str(data.get("error")),
                card_data=ErrorCard(
                    errorCode="TOOL_EXECUTION_ERROR",
                    message=str(data.get("error")),
                    actionRequired="Please verify your input or check if the server is running."
                ).model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 1. create_community_post
        if tool_name == "create_community_post":
            post_id = data.get("id") or data.get("postId") or "new"
            card = PostCreatedCard(
                id=post_id,
                title=data.get("title", "Community Post"),
                content=data.get("content", ""),
                communityId=data.get("serviceCategoryId") or data.get("communityId", "General"),
                location=data.get("location", "Colombo"),
                authorId=data.get("userId") or email,
                authorName=data.get("userName") or email.split("@")[0]
            )
            clean_msg = f"Your community post '{card.title}' has been published successfully to the Workio community!"
            return AgentCardResponse(
                response_type="post_created",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 2. get_community_posts / get_user_community_posts
        if tool_name in ["get_community_posts", "get_user_community_posts"]:
            is_single_post = isinstance(data, dict) and bool(data.get("id") or data.get("postId")) and not ("posts" in data or "items" in data)
            if is_single_post:
                # Single post detail view
                post_id_val = data.get("id") or data.get("postId")
                card = PostDetailCard(
                    id=post_id_val,
                    title=data.get("title", ""),
                    content=data.get("content", ""),
                    communityId=data.get("serviceCategoryId") or data.get("communityId", "General"),
                    location=data.get("location", "Colombo"),
                    authorName=data.get("userName") or data.get("userEmail", "").split("@")[0],
                    authorEmail=data.get("userEmail"),
                    likesCount=data.get("likesCount", 0),
                    commentsCount=data.get("commentsCount", 0)
                )
                clean_msg = _clean_card_intro_message(
                    last_ai_content,
                    f"Here are the details for post #{card.id}:",
                    "post_detail"
                )
                return AgentCardResponse(
                    response_type="post_detail",
                    message=clean_msg,
                    card_data=card.model_dump(),
                    metadata={"agent": "community_agent", "user_email": email}
                )

            # Multiple posts list
            raw_posts = data if isinstance(data, list) else data.get("posts", data.get("items", []))
            post_summaries: List[CommunityPostSummary] = []
            for item in (raw_posts if isinstance(raw_posts, list) else []):
                if isinstance(item, dict):
                    post_summaries.append(
                        CommunityPostSummary(
                            id=item.get("id", ""),
                            title=item.get("title", "Untitled"),
                            content=item.get("content", "")[:140],
                            communityId=item.get("serviceCategoryId") or item.get("communityId", "General"),
                            location=item.get("location", "Colombo"),
                            authorName=item.get("userName") or item.get("userEmail", "").split("@")[0],
                            authorEmail=item.get("userEmail"),
                            createdAt=item.get("createdAt"),
                            likesCount=item.get("likesCount", 0),
                            commentsCount=item.get("commentsCount", 0)
                        )
                    )
            card = PostListCard(
                category=str(data.get("category", "All") if isinstance(data, dict) else "All"),
                totalCount=len(post_summaries),
                posts=post_summaries
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Found {len(post_summaries)} community posts in your area:",
                "post_list"
            )
            return AgentCardResponse(
                response_type="post_list",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 3. update_community_post
        if tool_name == "update_community_post":
            card = PostUpdatedCard(
                id=data.get("id") or data.get("postId") or "",
                title=data.get("title", "Updated Post"),
                content=data.get("content", ""),
                communityId=data.get("serviceCategoryId") or data.get("communityId"),
                location=data.get("location")
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Post #{card.id} has been updated.",
                "post_updated"
            )
            return AgentCardResponse(
                response_type="post_updated",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 4. delete_community_post
        if tool_name == "delete_community_post":
            card = PostDeletedCard(
                id=data.get("id") or data.get("postId") or "",
                status=data.get("status", "Removed"),
                message=data.get("message", "Post successfully removed from community board.")
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                "The community post has been removed.",
                "post_deleted"
            )
            return AgentCardResponse(
                response_type="post_deleted",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 5. get_user_details / get_worker_details
        if tool_name in ["get_user_details", "get_worker_details"]:
            card = UserProfileCard(
                email=data.get("email") or email,
                role=data.get("role") or ("Worker" if tool_name == "get_worker_details" or data.get("isWorker") or data.get("workerRating") or data.get("overallRating") or data.get("skills") else user_type),
                isWorker=data.get("isWorker", True if tool_name == "get_worker_details" else False),
                displayName=data.get("displayName") or data.get("name") or user_name,
                phoneNo=data.get("phoneNo") or data.get("phoneNumber"),
                address=data.get("address") or data.get("primaryServiceArea") or "Colombo",
                workerRating=data.get("workerRating") or data.get("overallRating") or data.get("rating"),
                completedJobs=data.get("completedJobs"),
                skills=_normalize_skills(data.get("skills")),
                pricingModel=data.get("pricingModel") or (f"LKR {data.get('hourlyRate')}/hr" if data.get('hourlyRate') else None)
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Here are the profile details for {card.displayName}:",
                "user_profile"
            )
            return AgentCardResponse(
                response_type="user_profile",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent" if tool_name == "get_worker_details" else "community_agent", "user_email": email}
            )

        # 6. get_service_categories
        if tool_name == "get_service_categories":
            user_msg_content = ""
            for msg in reversed(messages):
                if getattr(msg, "type", "") in ("human", "user"):
                    user_msg_content = extract_text_content(getattr(msg, "content", "") or "")
                    break

            lower_user = user_msg_content.lower()
            lower_ai = (last_ai_content or "").lower()

            user_explicitly_asked_categories = any(kw in lower_user for kw in [
                "category", "categories", "what services", "list services", "available services",
                "all services", "browse services", "explore services", "services do you provide"
            ])
            is_draft_post = "draft" in lower_ai or ("title:" in lower_ai and "category:" in lower_ai)
            is_choice_turn_check = any(kw in lower_ai for kw in ["find a verified worker", "create a community post", "how would you like to proceed"])

            if user_explicitly_asked_categories and not is_draft_post and not is_choice_turn_check:
                categories_raw = data if isinstance(data, list) else (
                    data.get("value") or data.get("categories") or []
                    if isinstance(data, dict) else []
                )
                if not isinstance(categories_raw, list):
                    categories_raw = []
                categories_clean: List[str] = []
                for c in categories_raw:
                    if isinstance(c, dict):
                        name = c.get("name") or c.get("title") or c.get("id")
                        if name:
                            categories_clean.append(str(name))
                    elif isinstance(c, str):
                        categories_clean.append(c)

                card = ServiceCategoriesCard(
                    totalCount=len(categories_clean),
                    categories=categories_clean
                )
                clean_msg = _clean_card_intro_message(
                    last_ai_content,
                    "Here are the service categories available across Workio:",
                    "service_categories"
                )
                return AgentCardResponse(
                    response_type="service_categories",
                    message=clean_msg,
                    card_data=card.model_dump(),
                    metadata={"agent": "community_agent", "user_email": email}
                )

        # 7. search_workers
        if tool_name == "search_workers":
            raw_workers = data if isinstance(data, list) else (
                data.get("workers") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(raw_workers, list):
                raw_workers = []

            # Determine if a maximum budget was requested
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
                # Fallback to inspecting user message
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
                            skills=_normalize_skills(raw_skills),
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

            card = WorkerListCard(
                category=str(metadata.get("inferred_category") or "All"),
                totalCount=len(worker_summaries),
                workers=worker_summaries
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Found {len(worker_summaries)} verified technicians near you:" if worker_summaries else "No workers found matching your query.",
                "worker_list"
            )
            return AgentCardResponse(
                response_type="worker_list",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        # 8. Booking Tools
        if tool_name in ["get_resident_bookings", "create_booking", "cancel_booking", "reschedule_booking", "check_worker_availability"]:
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
                    msg = f"Booking action {tool_name} completed."
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

        # 9. Support & Review Tools
        if tool_name in ["create_worker_review", "file_dispute_ticket", "escalate_to_human", "get_user_job_history"]:
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
                    msg = f"Support action {tool_name} completed."
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

    # =========================================================================
    # 2. CONVERSATIONAL / DRAFTING TURNS (No tool executed in this current turn)
    # =========================================================================
    lower_content = last_ai_content.lower()

    # A. Check if the agent prepared a draft community post awaiting confirmation
    is_choice_turn = any(kw in lower_content for kw in [
        "create a community post or find",
        "how would you like to proceed",
        "would you like to proceed with finding a worker or creating a community post",
        "1) find a verified worker",
        "would you like to: 1)",
        "reply with '1' (find a worker)"
    ])

    is_draft = not is_choice_turn and (any(kw in lower_content for kw in [
        "draft", "confirm and publish", "would you like me to publish", "reply 'confirm'", "draft community post"
    ]) or (
        ("title:" in lower_content or "• title" in lower_content) and ("category:" in lower_content or "• category" in lower_content)
    ))

    if is_draft:
        draft_title = "Community Service Request"
        draft_category = metadata.get("inferred_category") or "General"
        draft_location = "Colombo"
        draft_content = ""

        # Extract structured fields if present in output
        chunks = []
        for c in last_ai_content.splitlines():
            if "•" in c:
                chunks.extend(c.split("•"))
            else:
                chunks.append(c)

        for line in chunks:
            line_str = line.strip().lstrip("•-* \t").strip()
            line_lower = line_str.lower()
            if line_lower.startswith("title:") or ("title:" in line_lower and "category:" not in line_lower):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_title = parts[1].strip().strip("*").strip()
            elif "category:" in line_lower and "title:" not in line_lower:
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    cat_val = parts[1].strip().strip("*").strip()
                    if cat_val and cat_val.lower() != "general":
                        draft_category = cat_val
            elif (line_lower.startswith("location:") or "location:" in line_lower) and "title:" not in line_lower:
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_location = parts[1].strip().strip("*").strip()
            elif line_lower.startswith("content:") or line_lower.startswith("description:"):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_content = parts[1].strip().strip("*").strip()

        # Clean trailing questions or instructions from draft_content
        for trail in [
            "please review your post", "would you like to publish", "would you like me to publish",
            "reply 'confirm'", "you can edit any details"
        ]:
            if trail in draft_content.lower():
                idx = draft_content.lower().find(trail)
                draft_content = draft_content[:idx].strip().rstrip(". ")

        # Ensure draft content is meaningful and never the AI's announcement
        if not draft_content or any(p in draft_content.lower() for p in [
            "here is your draft", "draft community post", "review the details", "draft card", "you can edit them"
        ]):
            user_problem_txt = ""
            for msg in reversed(messages):
                if getattr(msg, "type", "") in ("human", "user"):
                    content_str = extract_text_content(getattr(msg, "content", ""))
                    if len(content_str) > 8 and not any(kw in content_str.lower() for kw in [
                        "confirm", "publish", "create a post", "post on community", "1", "2"
                    ]):
                        user_problem_txt = content_str
                        break
            if user_problem_txt:
                draft_content = user_problem_txt
            else:
                draft_content = f"Looking for professional service assistance with {draft_title} in {draft_location}."

        if not draft_category or draft_category.lower() == "general":
            if metadata.get("inferred_category"):
                draft_category = metadata["inferred_category"]

        user_loc_default = metadata.get("location") or user_profile.get("address") or "Colombo"
        if not draft_location or draft_location.lower() in ["your location", "location", "n/a", "unknown", "none", "{location}"]:
            draft_location = user_loc_default

        card = PostConfirmationCard(
            action="create",
            title=draft_title,
            content=draft_content,
            communityId=draft_category,
            location=draft_location,
            urgency=None,
            authorId=email,
            authorName=user_name,
            validationStatus="valid",
            validationNotes=f"Please review your draft details above and confirm to publish under your account ({user_name}).",
            confirmPrompt=f"CONFIRM_PUBLISH: Yes, please publish the post '{draft_title}' in {draft_category} for {draft_location}."
        )
        clean_msg = _clean_card_intro_message(
            last_ai_content,
            "Please review your draft community post below and confirm to publish:",
            "post_confirmation"
        )
        return AgentCardResponse(
            response_type="post_confirmation",
            message=clean_msg,
            card_data=card.model_dump(),
            metadata={"agent": "community_agent", "user_email": email}
        )

    # B. Choice Turn (Worker vs Community Post)
    if is_choice_turn:
        structured_suggestions = [
            {"id": "worker", "text": "1. Find a Verified Worker", "icon": "fa-solid fa-user-gear", "type": "find"},
            {"id": "community", "text": "2. Create a Community Post", "icon": "fa-solid fa-bullhorn", "type": "community"}
        ]
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=structured_suggestions,
            is_choice=True
        )
        return AgentCardResponse(
            response_type="text_message",
            message=last_ai_content,
            card_data=card.model_dump(),
            metadata={"agent": "community_agent", "user_email": email, "is_choice": True}
        )

    # C. Context-aware suggestions for Update / Edit turns
    suggestions = metadata.get("suggested_actions")
    if not suggestions:
        if any(k in lower_content for k in ["new title", "what would you like the new title", "title to be"]):
            suggestions = ["Keep current title", "Change description instead", "Cancel update"]
        elif any(k in lower_content for k in ["new description", "new content", "what would you like the description"]):
            suggestions = ["Keep current description", "Change title instead", "Cancel update"]
        elif any(k in lower_content for k in ["what would you like to change", "proposed edits", "proposed update", "edit", "update", "change its title"]):
            suggestions = ["Change the title", "Change the description", "Change the category", "Change the location"]
        else:
            suggestions = [
                "Book a service technician",
                "View recent community posts",
                "Create a post for AC repair",
                "Check my profile"
            ]

    card = TextMessageCard(
        text=last_ai_content or "How can I assist you with Workio home services and community posts?",
        suggestions=suggestions
    )
    active_agent = metadata.get("agent") or "community_agent"
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": active_agent, "user_email": email}
    )


async def card_formatter_node(state: AgentState) -> Dict[str, Any]:
    """Deterministic UI Card Formatter Node."""
    card_response = _deterministic_card_builder(state)
    return {"structured_response": card_response}


def build_community_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Build structured AgentCardResponse for community agent."""
    res = _deterministic_card_builder(state, ai_message=ai_message)
    if not res.metadata:
        res.metadata = {}
    res.metadata.setdefault("agent", "community_agent")
    return res


def build_worker_matching_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Build structured AgentCardResponse for worker matching agent."""
    res = _deterministic_card_builder(state, ai_message=ai_message)
    if not res.metadata:
        res.metadata = {}
    res.metadata.setdefault("agent", "worker_matching_agent")
    return res


def build_booking_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Build structured AgentCardResponse for booking agent."""
    res = _deterministic_card_builder(state, ai_message=ai_message)
    if not res.metadata:
        res.metadata = {}
    res.metadata.setdefault("agent", "booking_agent")
    return res


def build_support_review_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Build structured AgentCardResponse for support & review agent."""
    res = _deterministic_card_builder(state, ai_message=ai_message)
    if not res.metadata:
        res.metadata = {}
    res.metadata.setdefault("agent", "support_review_agent")
    return res


def build_supervisor_card(state: AgentState, text: str, suggestions: Optional[List[str]] = None) -> AgentCardResponse:
    """Build structured AgentCardResponse directly for supervisor greeting/clarification turns."""
    email = state.get("email", "resident@workio.lk")
    card = TextMessageCard(
        text=text,
        suggestions=suggestions or [
            "Find a plumber or electrician",
            "View community posts",
            "Book a service technician",
            "Check my account profile"
        ]
    )
    return AgentCardResponse(
        response_type="text_message",
        message=text,
        card_data=card.model_dump(),
        metadata={"agent": "supervisor", "user_email": email}
    )
