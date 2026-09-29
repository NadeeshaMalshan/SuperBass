"""
Deterministic UI Card Builder & Structured Output Utilities for SuperBass (Architecture A).
Translates agent execution state and MCP tool outputs into strictly typed Pydantic
UI Card responses (AgentCardResponse) for the frontend application without brittle regex parsing.
"""

from typing import Dict, Any, List, Optional
import json
import logging
from langchain_core.messages import ToolMessage, AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
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
    WorkerListCard,
    WorkerSummary,
    CommunityPostSummary,
    SpecialistConversationalOutput
)

logger = logging.getLogger("agent_backend.card_builders")


def _normalize_skills(raw: Any) -> List[str]:
    """Ensure skills are always a clean list of strings, extracting names if dicts are provided."""
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
    Ensures that when a rich interactive UI card is rendered below the chat bubble,
    the chat bubble message does not duplicate card fields or bulleted dumps.
    """
    if not raw_msg or not isinstance(raw_msg, str):
        return default_intro

    if card_type == "post_confirmation":
        return "Here is your draft community post. Please review your post details below, edit if needed, and confirm to publish:"

    text = raw_msg.strip()
    for marker in ["1) Post ID:", "1. Post ID:", "1) ", "• Title:", "- Title:", "Post ID:"]:
        if marker in text:
            head = text.split(marker, 1)[0].strip()
            if head and len(head) > 5:
                text = head
                break

    cleaned = text.strip()
    return cleaned if cleaned else default_intro


async def format_specialist_structured_message(
    prompt: Any,
    response: AIMessage,
    llm: Optional[ChatOpenAI] = None
) -> AIMessage:
    """
    Validates and formats the specialist agent's conversational output using
    Pydantic Structured Output (with_structured_output).
    Enforces a clean, friendly 1-2 sentence message via SpecialistConversationalOutput.
    """
    raw_content = getattr(response, "content", "")
    if not isinstance(raw_content, str) or not raw_content:
        return response

    has_dump = any(
        kw in raw_content.lower()
        for kw in ["post id:", "• title", "hourly rate:", "skills:", "rating:"]
    ) or "1." in raw_content or "1)" in raw_content
    if not has_dump:
        return response

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            active_llm = llm or ChatOpenAI(
                model=settings.openai_model,
                temperature=0.2,
                api_key=settings.openai_api_key
            )
            structured_llm = active_llm.with_structured_output(SpecialistConversationalOutput)
            structured_res: SpecialistConversationalOutput = await structured_llm.ainvoke(prompt)
            if structured_res and structured_res.message:
                logger.info(f"✨ [Structured Output] Enforced schema message: '{structured_res.message[:80]}...'")
                return AIMessage(content=structured_res.message)
        except Exception as e:
            logger.warning(f"Structured output formatting notice: {e}")

    cleaned = _clean_card_intro_message(raw_content, "Here are the recommended service options:")
    return AIMessage(content=cleaned)


def _extract_draft_card(
    content: str,
    email: str,
    user_name: str,
    user_profile: dict,
    metadata: dict
) -> AgentCardResponse:
    """Extract draft post fields cleanly and deterministically without brittle regex."""
    title = ""
    category = metadata.get("inferred_category") or "Plumbing"
    location = metadata.get("location") or user_profile.get("address") or "Colombo"
    body_parts = []

    # Split by newlines and bullets
    chunks = []
    normalized = content.replace("•", "\n").replace("- Title:", "\nTitle:").replace("*Title:*", "\nTitle:")
    for line in normalized.splitlines():
        line_clean = line.strip().lstrip("•*-").strip()
        if line_clean:
            chunks.append(line_clean)

    for chunk in chunks:
        if ":" in chunk:
            prefix, _, value = chunk.partition(":")
            prefix_clean = prefix.strip().lower().replace("*", "")
            value_clean = value.strip().replace("*", "")
            if prefix_clean == "title":
                title = value_clean
            elif prefix_clean in ("category", "service category"):
                if value_clean and value_clean.lower() != "general":
                    category = value_clean
            elif prefix_clean == "location":
                if value_clean and value_clean.lower() not in ["your location", "location", "n/a", "unknown", "none", "{location}"]:
                    location = value_clean
            elif prefix_clean in ("content", "description"):
                body_parts.append(value_clean)
            elif not any(prefix_clean.startswith(x) for x in ["please review", "when ready", "you can edit", "status", "note"]):
                body_parts.append(chunk)
        else:
            if chunk and not any(kw in chunk.lower() for kw in ["please review", "when ready", "you can edit", "here is your draft"]):
                body_parts.append(chunk)

    if not title or title.lower() in ["community post", "untitled"]:
        title = f"{category} Service Request"
    content_text = " ".join(body_parts).strip() or content

    card = PostConfirmationCard(
        action="create",
        title=title,
        content=content_text,
        communityId=category,
        location=location,
        urgency=None,
        authorId=email,
        authorName=user_name,
        validationStatus="valid",
        validationNotes=f"Please review your draft details above and confirm to publish under your account ({user_name}).",
        confirmPrompt=f"CONFIRM_PUBLISH: Yes, please publish the post '{title}' in {category} for {location}."
    )
    clean_msg = _clean_card_intro_message(
        content,
        "Here is your draft community post. Please review the details below and confirm to publish:",
        "post_confirmation"
    )
    return AgentCardResponse(
        response_type="post_confirmation",
        message=clean_msg,
        card_data=card.model_dump(),
        metadata={"agent": "community_agent", "user_email": email}
    )


def _deterministic_card_builder(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Deterministic response builder based on tool execution logs and agent message."""
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}
    user_name = metadata.get("user_name") or user_profile.get("displayName") or (email.split("@")[0] if "@" in email else "Resident")

    last_ai_content = ""
    if ai_message and hasattr(ai_message, "content") and ai_message.content:
        last_ai_content = ai_message.content
    else:
        for msg in reversed(messages):
            if getattr(msg, "type", "") == "ai" and msg.content:
                last_ai_content = msg.content
                break

    lower_content = last_ai_content.lower()

    # Detect if the assistant has prepared a community post draft awaiting confirmation
    is_draft = (
        any(keyword in lower_content for keyword in [
            "draft community post", "draft post", "here is your draft",
            "confirm and publish", "review your post details", "review your draft details",
            "publish the post to the community board"
        ])
    ) and not any(kw in lower_content for kw in [
        "details for post", "show details for post", "show post #",
        "what service do you need", "what is the problem", "what type of service",
        "how would you like to proceed"
    ])

    # Find latest ToolMessage
    latest_tool: Optional[ToolMessage] = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
            break

    if latest_tool:
        tool_name = getattr(latest_tool, "name", "")
        raw_content = latest_tool.content
        data: Any = {}
        if isinstance(raw_content, str):
            try:
                data = json.loads(raw_content)
            except Exception:
                data = {"raw": raw_content}
        elif isinstance(raw_content, (dict, list)):
            data = raw_content

        # 1. create_community_post
        if tool_name == "create_community_post":
            card = PostCreatedCard(
                id=data.get("id") or data.get("postId") or 0,
                title=data.get("title", "Community Post"),
                content=data.get("content", ""),
                communityId=data.get("communityId", "General"),
                location=data.get("location", "Colombo"),
                authorId=data.get("authorId") or data.get("userEmail") or email,
                authorName=data.get("authorName") or data.get("userName") or user_name,
                status="Active"
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Your community post '{card.title}' has been successfully published to the community board!",
                "post_created"
            )
            return AgentCardResponse(
                response_type="post_created",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 2. get_community_posts & get_user_community_posts
        if tool_name in ("get_community_posts", "get_user_community_posts"):
            if is_draft:
                return _extract_draft_card(last_ai_content, email, user_name, user_profile, metadata)

            # Check if this is a single post detail response
            is_single = isinstance(data, dict) and bool(data.get("id") or data.get("postId")) and bool(data.get("title"))
            if not is_single:
                for m in reversed(messages):
                    content_str = str(getattr(m, "content", ""))
                    if "details for post #" in content_str.lower() or "show post #" in content_str.lower():
                        if isinstance(data, list) and len(data) == 1:
                            is_single = True
                            data = data[0]
                        break

            if is_single:
                post_id = str(data.get("id") or data.get("postId", ""))
                post_detail = PostDetailCard(
                    id=post_id,
                    title=data.get("title", f"Post #{post_id}"),
                    content=data.get("content", ""),
                    communityId=data.get("serviceCategoryId") or data.get("communityId", "General"),
                    location=data.get("location", "Colombo"),
                    authorName=data.get("authorName") or data.get("userName") or user_name,
                    authorEmail=data.get("authorEmail") or data.get("userEmail") or email,
                    createdAt=data.get("createdAt"),
                    likesCount=data.get("likesCount", 0),
                    commentsCount=data.get("commentsCount", 0),
                    comments=data.get("comments") or []
                )
                clean_msg = _clean_card_intro_message(
                    last_ai_content,
                    f"Here are the details for post #{post_id} ({post_detail.title}):",
                    "post_detail"
                )
                return AgentCardResponse(
                    response_type="post_detail",
                    message=clean_msg,
                    card_data=post_detail.model_dump(),
                    metadata={"agent": "community_agent", "user_email": email}
                )

            # Multiple posts list
            raw_posts = data if isinstance(data, list) else (
                data.get("posts") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            posts_list = []
            for p in raw_posts:
                if isinstance(p, dict):
                    pid = str(p.get("id") or p.get("postId") or "")
                    posts_list.append(CommunityPostSummary(
                        id=pid,
                        title=p.get("title", f"Post #{pid}"),
                        content=p.get("content", ""),
                        communityId=p.get("serviceCategoryId") or p.get("communityId", "General"),
                        location=p.get("location", "Colombo"),
                        authorName=p.get("authorName") or p.get("userName"),
                        authorEmail=p.get("authorEmail") or p.get("userEmail"),
                        createdAt=p.get("createdAt"),
                        likesCount=p.get("likesCount", 0),
                        commentsCount=p.get("commentsCount", 0)
                    ))
            card = PostListCard(
                category=metadata.get("category", "All"),
                totalCount=len(posts_list),
                posts=posts_list,
                page=1
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Found {len(posts_list)} community posts. You can click any post card below to view details:",
                "post_list"
            )
            if "click any post card" not in clean_msg.lower():
                clean_msg = f"{clean_msg} You can click any post card below to view details."
            return AgentCardResponse(
                response_type="post_list",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 3. update_community_post
        if tool_name == "update_community_post":
            card = PostUpdatedCard(
                id=data.get("id") or data.get("postId") or 0,
                title=data.get("title", "Updated Post"),
                content=data.get("content", ""),
                communityId=data.get("communityId"),
                location=data.get("location")
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Community post #{card.id} has been updated successfully!",
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
                id=data.get("id") or data.get("postId") or 0,
                status="Removed",
                message="Community post successfully removed."
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Community post #{card.id} has been deleted.",
                "post_deleted"
            )
            return AgentCardResponse(
                response_type="post_deleted",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 5. get_user_details / get_worker_details
        if tool_name in ("get_user_details", "get_worker_details"):
            if is_draft:
                return _extract_draft_card(last_ai_content, email, user_name, user_profile, metadata)
            card = UserProfileCard(
                email=data.get("email", email),
                role=data.get("role", user_type),
                isWorker=data.get("isWorker", False),
                displayName=data.get("displayName") or data.get("name"),
                phoneNo=data.get("phoneNo"),
                address=data.get("address"),
                workerRating=data.get("workerRating") or data.get("overallRating"),
                skills=_normalize_skills(data.get("skills") or (data.get("workerProfile", {}).get("skills") if isinstance(data.get("workerProfile"), dict) else None))
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Profile details for {card.displayName or card.email}:",
                "user_profile"
            )
            return AgentCardResponse(
                response_type="user_profile",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 6. get_service_categories
        if tool_name == "get_service_categories":
            if is_draft:
                return _extract_draft_card(last_ai_content, email, user_name, user_profile, metadata)
            categories_raw = data if isinstance(data, list) else (
                data.get("value") or data.get("categories") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(categories_raw, list):
                categories_raw = []
            card = ServiceCategoriesCard(
                categories=categories_raw,
                totalCount=len(categories_raw)
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Here are {len(categories_raw)} official service categories available on Workio:",
                "service_categories"
            )
            return AgentCardResponse(
                response_type="service_categories",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 7. create_booking
        if tool_name == "create_booking":
            booking_id = data.get("id") or data.get("bookingId") or "confirmed"
            card = TextMessageCard(
                text=last_ai_content or f"Your service booking has been created successfully! Booking reference #{booking_id}.",
                suggestions=["View my bookings", "Book another service", "Explore community posts"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 8. check_worker_availability
        if tool_name == "check_worker_availability":
            is_avail = data.get("isSlotAvailable", data.get("isAvailable", False))
            w_name = data.get("workerName") or f"Worker #{data.get('workerId', '')}"
            card = TextMessageCard(
                text=last_ai_content or (f"{w_name} is available for the requested time slot!" if is_avail else f"{w_name} is not available at that time: {data.get('reason', 'Schedule conflict')}."),
                suggestions=["Confirm booking", "Choose another time", "Search other workers"] if is_avail else ["Check another time slot", "Find other workers"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 9. reschedule_booking
        if tool_name == "reschedule_booking":
            b_id = data.get("bookingId") or data.get("id") or ""
            msg = last_ai_content or f"Booking #{b_id} has been rescheduled successfully."
            card = TextMessageCard(text=msg, suggestions=["View my bookings", "Contact worker"])
            return AgentCardResponse(
                response_type="text_message",
                message=msg,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 10. cancel_booking
        if tool_name == "cancel_booking":
            b_id = data.get("bookingId") or data.get("id") or ""
            msg = last_ai_content or f"Booking #{b_id} has been cancelled successfully."
            card = TextMessageCard(text=msg, suggestions=["Book another service", "View my bookings"])
            return AgentCardResponse(
                response_type="text_message",
                message=msg,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 11. create_worker_review
        if tool_name == "create_worker_review":
            msg = last_ai_content or "Your review has been successfully submitted and recorded. Thank you for your feedback!"
            card = TextMessageCard(text=msg, suggestions=["View worker profile", "Book another service"])
            return AgentCardResponse(
                response_type="text_message",
                message=msg,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        # 12. create_dispute_ticket
        if tool_name == "create_dispute_ticket":
            t_id = data.get("ticketId") or data.get("id") or ""
            msg = last_ai_content or f"Support ticket #{t_id} has been submitted and recorded. Our support team will follow up promptly."
            card = TextMessageCard(text=msg, suggestions=["Check ticket status", "Contact support"])
            return AgentCardResponse(
                response_type="text_message",
                message=msg,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        # 13. search_workers
        if tool_name == "search_workers":
            raw_workers = data if isinstance(data, list) else (
                data.get("workers") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(raw_workers, list):
                raw_workers = []

            # Check if there was a budget limit in tool calls or messages
            max_budget: Optional[float] = None
            for msg in reversed(messages):
                t_calls = getattr(msg, "tool_calls", None)
                if t_calls:
                    for tc in t_calls:
                        args = tc.get("args") or {}
                        if args.get("maxHourlyRate"):
                            try:
                                max_budget = float(args["maxHourlyRate"])
                                break
                            except Exception:
                                pass
                if max_budget is not None:
                    break

            if max_budget is None:
                for msg in reversed(messages):
                    if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                        txt = str(msg.content).lower()
                        for marker in ["below ", "under ", "less than ", "max ", "budget "]:
                            if marker in txt:
                                part = txt.split(marker, 1)[1].split()[0].replace(",", "").replace("/hr", "")
                                try:
                                    max_budget = float(part)
                                    break
                                except Exception:
                                    pass
                        if max_budget is not None:
                            break

            filtered_workers = []
            for w in raw_workers:
                if isinstance(w, dict):
                    rate = w.get("hourlyRate") or w.get("rate") or 0.0
                    try:
                        rate = float(rate)
                    except Exception:
                        rate = 0.0
                    if max_budget is not None and rate > max_budget:
                        continue
                    filtered_workers.append(WorkerSummary(
                        id=w.get("id") or w.get("workerId") or 0,
                        name=w.get("name") or w.get("displayName") or "Service Professional",
                        profileImage=w.get("profileImage") or w.get("avatarUrl"),
                        primaryRole=w.get("primaryRole") or w.get("description") or "Verified Service Professional",
                        skills=_normalize_skills(w.get("skills")),
                        primaryServiceArea=w.get("primaryServiceArea") or w.get("serviceArea") or "Colombo",
                        hourlyRate=rate if rate > 0 else None,
                        dailyRate=w.get("dailyRate"),
                        pricingModel=w.get("pricingModel", "Hourly"),
                        overallRating=w.get("overallRating") or w.get("rating") or 5.0,
                        reviewCount=w.get("reviewCount", 0),
                        completedJobs=w.get("completedJobs", 0),
                        isAvailable=w.get("isAvailable", True)
                    ))

            if not filtered_workers:
                msg = ""
                if max_budget is not None and raw_workers:
                    rates = []
                    for w in raw_workers:
                        r = w.get("hourlyRate") or w.get("rate")
                        if r:
                            try:
                                rates.append(float(r))
                            except Exception:
                                pass
                    lowest = min(rates) if rates else 2400.0
                    msg = f"I couldn't find verified professionals under LKR {int(max_budget)}/hr. The lowest available rate in this category starts from LKR {int(lowest)}/hr."
                elif last_ai_content and not any(kw in last_ai_content.lower() for kw in ["here are the available", "found verified", "available plumbers"]):
                    msg = last_ai_content
                elif max_budget is not None:
                    msg = f"I couldn't find verified professionals under LKR {int(max_budget)}/hr. Would you like to expand your search or create a community post?"
                else:
                    msg = "No verified service professionals were found matching your criteria. Would you like to create a community post instead?"

                card = TextMessageCard(
                    text=msg,
                    suggestions=["Create a community post", "Search other categories", "Explore all workers"]
                )
                return AgentCardResponse(
                    response_type="text_message",
                    message=card.text,
                    card_data=card.model_dump(),
                    metadata={"agent": "worker_matching_agent", "user_email": email}
                )

            worker_card = WorkerListCard(
                category=metadata.get("category"),
                query=metadata.get("query"),
                totalCount=len(filtered_workers),
                workers=filtered_workers
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Found {len(filtered_workers)} verified service professionals matching your request:",
                "worker_list"
            )
            return AgentCardResponse(
                response_type="worker_list",
                message=clean_msg,
                card_data=worker_card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        # 14. Default tool fallback
        msg_text = last_ai_content or f"Operation '{tool_name}' completed."
        card = TextMessageCard(text=msg_text, suggestions=None)
        return AgentCardResponse(
            response_type="text_message",
            message=msg_text,
            card_data=card.model_dump(),
            metadata={"agent": "agent", "user_email": email}
        )

    # If no tool was executed but agent generated a draft post
    if is_draft:
        return _extract_draft_card(last_ai_content, email, user_name, user_profile, metadata)

    # Conversational fallback
    fallback_text = last_ai_content or "How can I assist you with Workio home services and community posts?"
    suggestions = None
    if any(q in lower_content for q in ["how would you like to proceed", "would you like me to find a", "or create a community post"]):
        suggestions = [
            {"title": "Find a verified worker", "subtitle": "Connect with local technicians"},
            {"title": "Create a community post", "subtitle": "Post your request to the community"}
        ]

    card = TextMessageCard(text=fallback_text, suggestions=suggestions)
    return AgentCardResponse(
        response_type="text_message",
        message=fallback_text,
        card_data=card.model_dump(),
        metadata={"agent": "assistant", "user_email": email}
    )


def build_worker_matching_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Builds typed UI Card response for Worker Matching Agent."""
    return _deterministic_card_builder(state, ai_message)


def build_booking_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Builds typed UI Card response for Booking Agent."""
    return _deterministic_card_builder(state, ai_message)


def build_community_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Builds typed UI Card response for Community Agent."""
    return _deterministic_card_builder(state, ai_message)


def build_support_review_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Builds typed UI Card response for Support & Review Agent."""
    return _deterministic_card_builder(state, ai_message)


def build_supervisor_card(
    state: AgentState,
    direct_text: str,
    suggestions: Optional[List[str]] = None
) -> AgentCardResponse:
    """Builds typed UI Card response for Supervisor Agent direct response."""
    email = state.get("email", "resident@workio.lk")
    card_suggestions: Optional[List[Any]] = None
    if suggestions:
        card_suggestions = [
            {"title": s, "subtitle": "Action"} if isinstance(s, str) else s
            for s in suggestions
        ]
    else:
        card_suggestions = [
            {"title": "Find a verified worker", "subtitle": "Connect with local technicians"},
            {"title": "Create a community post", "subtitle": "Post your request to the community"}
        ]

    card = TextMessageCard(text=direct_text, suggestions=card_suggestions)
    return AgentCardResponse(
        response_type="text_message",
        message=direct_text,
        card_data=card.model_dump(),
        metadata={"agent": "supervisor", "user_email": email}
    )
