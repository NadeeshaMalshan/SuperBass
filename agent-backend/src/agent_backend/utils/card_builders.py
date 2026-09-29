"""
Deterministic UI Card Builder Utilities for SuperBass (Architecture A).
Translates agent execution history and tool outputs into strictly typed Pydantic
UI Card responses (AgentCardResponse) for the frontend application.
"""

from typing import Dict, Any, List, Optional
import json
import logging
import re
from langchain_core.messages import SystemMessage, ToolMessage, HumanMessage, AIMessage
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
    ErrorCard,
    CommunityPostSummary,
    WorkerListCard,
    WorkerSummary,
    SpecialistConversationalOutput
)

logger = logging.getLogger("agent_backend.card_builders")


CARD_FORMATTER_PROMPT = """You are the Frontend UI Card Formatter for Workio.
Your role is to format the conversation output and any tool results into a structured AgentCardResponse JSON object so the Frontend can render the appropriate interactive UI card component.

Available response_type values and their corresponding card_data schemas:
0. "post_confirmation": Use ONLY when the user has explicitly requested or confirmed creating/updating a community post and the assistant is presenting the complete draft with title, content, and category.
   DO NOT use "post_confirmation" when the assistant is summarizing a user's problem or asking whether to find a worker vs create a post! In those cases, use "text_message" with suggestions.
   card_data fields: action ("create" or "update"), postId (if update), title, content, communityId, location, validationStatus ("valid"), validationNotes, confirmPrompt (e.g. "CONFIRM_PUBLISH: title=... content=...").
1. "post_created": Use when a new community post has actually been published to the backend via tool execution.
   card_data fields: id, title, content, communityId, location, authorId, authorName, status, createdAt.
2. "post_list": Use when returning a list or feed of community posts.
   card_data fields: category, totalCount, posts (list of {id, title, content, communityId, location, authorName, authorEmail, createdAt, likesCount, commentsCount}), page.
3. "post_detail": Use when a specific single post was requested or viewed.
   card_data fields: id, title, content, communityId, location, authorName, authorEmail, createdAt, likesCount, commentsCount, comments.
4. "post_updated": Use when an existing post was modified via tool execution.
   card_data fields: id, title, content, communityId, location, updatedAt.
5. "post_deleted": Use when a post was removed or deleted.
   card_data fields: id, status="Removed", message, deletedAt.
6. "user_profile": Use when user or worker profile details were fetched.
   card_data fields: email, role, isWorker, displayName, phoneNo, address, workerRating, completedJobs, skills, pricingModel.
7. "service_categories": Use when get_service_categories tool was called and returned a list of service categories.
   card_data fields: categories (list of category objects with id, name, icon), totalCount.
8. "worker_list": Use whenever search_workers tool was called or when recommending/finding service workers or technicians.
   card_data fields: category, query, totalCount, workers (list of {id, name, profileImage, primaryRole, skills, primaryServiceArea, hourlyRate, dailyRate, pricingModel, overallRating, reviewCount, completedJobs, isAvailable}).
9. "text_message": Use for conversational replies, greetings, booking updates, explanations, or questions.
   card_data fields: text, suggestions (list of quick prompt suggestions).
   CRITICAL: NEVER output suggestions for tips, gardening tips, advice, or DIY tutorials (e.g. NEVER output "Get gardening tips", "Get tips on fixing it myself", etc.). When asking how to proceed, suggestions MUST be strictly 2 choices: ["Find a <trade/worker>", "Create a community post"].
10. "error": Use if a tool or operation failed with an error.
   card_data fields: errorCode, message, actionRequired.

Choose the exact response_type that best represents the latest action.
"""


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
    the chat bubble message does not duplicate card fields, markdown image tags,
    bulleted worker/post dumps, or telephone links.
    Preserves clean introductory text and any natural closing call-to-action question.
    """
    if not raw_msg or not isinstance(raw_msg, str):
        return default_intro

    text = raw_msg.strip()

    if card_type == "post_confirmation":
        return "Here is your draft community post. Please review your post details below, edit if needed, and confirm to publish:"

    # Detect if the text contains repetitive itemized card details (numbers/bullets followed by bold names, markdown images, tel links, etc.)
    has_dump = bool(
        re.search(
            r'(?:(?:\n|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*]\s*\*\*)|!\[.*?\]\(.*?\)|\(tel:\d+\)|###\s+[A-Z])',
            text
        )
    )

    if not has_dump:
        return text

    # Extract the introductory text before the first worker/post item (e.g. before "1. **" or "- **" or "![")
    intro_match = re.search(
        r'^(.*?)(?=(?:\s*\n\s*|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*]\s*\*\*|!\[.*?\]\(.*?\)|###\s+))',
        text,
        re.DOTALL
    )
    intro = intro_match.group(1).strip() if intro_match else ""

    # Extract any concluding question or call to action at the end of the text
    closing_match = re.search(
        r'(?:(?:\n|\.\s+|:\s+))([A-Z][^\n]*\?)\s*$',
        text
    )
    closing = closing_match.group(1).strip() if closing_match else ""

    parts = []
    if intro and len(intro) > 8 and not intro.startswith(("1.", "-", "*")):
        # Ensure proper punctuation at the end of intro
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
    # Strip any stray markdown image embeds or tel links if any remained
    cleaned = re.sub(r'!\[.*?\]\(.*?\)', '', cleaned).strip()
    cleaned = re.sub(r'\[(.*?)\]\(tel:.*?\)', r'\1', cleaned).strip()
    # Normalize multiple spaces
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    return cleaned if cleaned else default_intro


async def format_specialist_structured_message(
    prompt: list,
    response: AIMessage,
    llm: Optional[ChatOpenAI] = None
) -> AIMessage:
    """
    Validates and formats the specialist agent's conversational output using
    Pydantic Structured Output (response_format / with_structured_output).
    If the response contains repetitive bullet lists, card dumps, or markdown images,
    enforces a clean, friendly 1-2 sentence message via SpecialistConversationalOutput.
    """
    raw_content = getattr(response, "content", "")
    if not isinstance(raw_content, str) or not raw_content:
        return response

    # Check if the message contains repetitive card-like dumps
    has_card_dump = bool(
        re.search(
            r'(?:(?:\n|\s+)(?:1\.\s*\*\*|\d+\.\s*\*\*|[-*]\s*\*\*)|!\[.*?\]\(.*?\)|\(tel:\d+\)|###\s+[A-Z])',
            raw_content
        )
    )
    if not has_card_dump:
        return response

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            active_llm = llm
            if not active_llm:
                active_llm = ChatOpenAI(
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

    # Fallback to local cleaner if offline or network error
    cleaned = _clean_card_intro_message(raw_content, "Here are the recommended service options:")
    return AIMessage(content=cleaned)


def _build_post_confirmation_response(
    last_ai_content: str,
    email: str,
    user_name: str,
    user_profile: dict,
    metadata: dict
) -> AgentCardResponse:
    """Robust extractor for community post drafts and builder for PostConfirmationCard."""
    draft_title = "Community Service Request"
    title_m = re.search(r'(?:•|\*|-|\n|\A)\s*Title\s*:\s*([^•\n\r]+)', last_ai_content, re.IGNORECASE)
    if title_m:
        val = title_m.group(1).strip().strip("*").strip()
        if val:
            draft_title = val

    draft_category = metadata.get("inferred_category") or "Plumbing"
    cat_m = re.search(r'(?:•|\*|-|\n|\A)\s*Category\s*:\s*([^•\n\r]+)', last_ai_content, re.IGNORECASE)
    if cat_m:
        val = cat_m.group(1).strip().strip("*").strip()
        if val and val.lower() != "general":
            draft_category = val

    user_loc_default = metadata.get("location") or user_profile.get("address") or "Colombo"
    draft_location = user_loc_default
    loc_m = re.search(r'(?:•|\*|-|\n|\A)\s*Location\s*:\s*([^•\n\r]+)', last_ai_content, re.IGNORECASE)
    if loc_m:
        val = loc_m.group(1).strip().strip("*").strip()
        if val and val.lower() not in ["your location", "location", "n/a", "unknown", "none", "{location}"]:
            draft_location = val

    draft_content = ""
    content_m = re.search(
        r'(?:•|\*|-|\n|\A)\s*(?:Content|Description)\s*:\s*(.*?)(?=(?:•|\n\s*(?:Location|Please review|When ready|You can edit)|Please review|When ready|You can edit|$))',
        last_ai_content,
        re.IGNORECASE | re.DOTALL
    )
    if content_m:
        draft_content = content_m.group(1).strip().strip("*").strip()

    if not draft_content:
        draft_content = last_ai_content

    if not draft_title or draft_title.lower() in ["community post", "untitled"]:
        draft_title = f"{draft_category} Service Request"

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
        ]) or (
            ("title:" in lower_content or "• title" in lower_content or "title :" in lower_content) and
            ("category:" in lower_content or "• category" in lower_content or "category :" in lower_content)
        )
    ) and not any(kw in lower_content for kw in [
        "what service do you need", "what is the problem", "what type of service",
        "how would you like to proceed"
    ])

    # Search for latest ToolMessage
    latest_tool: ToolMessage = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
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

        # Error check
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
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Your community post '{card.title}' has been published successfully!",
                "post_created"
            )
            return AgentCardResponse(
                response_type="post_created",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 2. get_community_posts / get_user_community_posts
        if tool_name in ["get_community_posts", "get_user_community_posts"]:
            # Could be list or single item or dict
            raw_posts = data if isinstance(data, list) else data.get("posts", data.get("items", []))
            if isinstance(data, dict) and data.get("id") and not isinstance(raw_posts, list):
                # Single post returned by ID
                card = PostDetailCard(
                    id=data.get("id"),
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

            # Multiple posts
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
                message="Community post marked as removed."
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                "Community post marked as removed.",
                "post_deleted"
            )
            return AgentCardResponse(
                response_type="post_deleted",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 5. get_user_details
        if tool_name == "get_user_details":
            if is_draft:
                return _build_post_confirmation_response(
                    last_ai_content, email, user_name, user_profile, metadata
                )
            card = UserProfileCard(
                email=data.get("email", email),
                role=data.get("role", user_type),
                isWorker=data.get("isWorker", False),
                displayName=data.get("displayName"),
                phoneNo=data.get("phoneNo"),
                address=data.get("address"),
                skills=_normalize_skills(data.get("workerProfile", {}).get("skills")) if isinstance(data.get("workerProfile"), dict) else None
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
            # If the assistant drafted a community post (using this tool only to lookup/validate the category),
            # return the draft post confirmation card rather than hijacking with the 22 categories explorer!
            if is_draft:
                return _build_post_confirmation_response(
                    last_ai_content, email, user_name, user_profile, metadata
                )

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

        # 9. search_workers
        if tool_name == "search_workers":
            raw_workers = data if isinstance(data, list) else (
                data.get("workers") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(raw_workers, list):
                raw_workers = []

            # Check if there was a budget limit in tool calls or user messages
            max_budget = None
            for msg in reversed(messages):
                t_calls = getattr(msg, "tool_calls", None)
                if t_calls:
                    for tc in t_calls:
                        if tc.get("name") == "search_workers":
                            tc_args = tc.get("args") or {}
                            if tc_args.get("maxHourlyRate"):
                                try:
                                    max_budget = float(tc_args["maxHourlyRate"])
                                except (ValueError, TypeError):
                                    pass
                            break
                    if max_budget is not None:
                        break

            if max_budget is None:
                for msg in reversed(messages):
                    if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                        user_txt = msg.content if isinstance(msg.content, str) else str(msg.content)
                        m = re.search(r'(?:below|under|less than|max(?:imum)?|rate of|budget of)\s*(?:rs\.?|lkr)?\s*(\d+)', user_txt, re.IGNORECASE)
                        if m:
                            try:
                                max_budget = float(m.group(1))
                            except ValueError:
                                pass
                            break

            worker_summaries: List[WorkerSummary] = []
            for w in raw_workers:
                if not isinstance(w, dict):
                    continue
                raw_skills = w.get("skills") or []
                skill_names = []
                if isinstance(raw_skills, list):
                    for s in raw_skills:
                        if isinstance(s, dict):
                            skill_names.append(s.get("skillName") or s.get("name") or "")
                        elif isinstance(s, str):
                            skill_names.append(s)
                skill_names = [s for s in skill_names if s]

                worker_summaries.append(
                    WorkerSummary(
                        id=w.get("id", 0),
                        name=w.get("name") or "Verified Worker",
                        profileImage=w.get("profileImage") or w.get("profilePicture"),
                        primaryRole=w.get("description") or "Verified Community Service Professional",
                        skills=skill_names if skill_names else ["General Handyman"],
                        primaryServiceArea=w.get("primaryServiceArea") or "Colombo",
                        hourlyRate=w.get("hourlyRate"),
                        dailyRate=w.get("dailyRate"),
                        pricingModel=w.get("pricingModel") or "Hourly",
                        overallRating=w.get("overallRating") or 5.0,
                        reviewCount=w.get("completedJobs", 0),
                        completedJobs=w.get("completedJobs", 0),
                        isAvailable=w.get("isAvailable", True),
                        distance=round(float(w["distance"]), 1) if w.get("distance") is not None else None
                    )
                )

            if max_budget is not None:
                worker_summaries = [w for w in worker_summaries if w.hourlyRate is not None and w.hourlyRate <= max_budget]

            if worker_summaries:
                # Guarantee closest workers first
                worker_summaries.sort(key=lambda x: (x.distance is None, float('inf') if x.distance is None else x.distance))
                card = WorkerListCard(
                    category=None,
                    query=None,
                    totalCount=len(worker_summaries),
                    workers=worker_summaries
                )
                clean_msg = _clean_card_intro_message(
                    last_ai_content,
                    f"I found {len(worker_summaries)} verified professionals matching your request:",
                    "worker_list"
                )
                return AgentCardResponse(
                    response_type="worker_list",
                    message=clean_msg,
                    card_data=card.model_dump(),
                    metadata={"agent": "worker_matching_agent", "user_email": email}
                )

            rates = [float(w.get("hourlyRate")) for w in raw_workers if isinstance(w, dict) and w.get("hourlyRate") is not None]
            min_rate = min(rates) if rates else None
            rate_info = f" The lowest available rate for nearby workers starts from Rs. {int(min_rate)}/hr." if min_rate else ""
            budget_str = f" with an hourly rate below Rs. {int(max_budget)}" if max_budget else " matching that criteria"
            no_match_text = f"No verified service workers found{budget_str}.{rate_info}"
            card = TextMessageCard(
                text=no_match_text,
                suggestions=["Create a community post", f"Show workers from Rs. {int(min_rate)}/hr"] if min_rate else ["Create a community post", "Search all workers"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        # 10. get_worker_details
        if tool_name == "get_worker_details":
            w_data = data if isinstance(data, dict) else {}
            card = UserProfileCard(
                email=w_data.get("email") or w_data.get("userEmail") or f"worker_{w_data.get('id', '')}@workio.lk",
                role="Worker",
                isWorker=True,
                displayName=w_data.get("name") or w_data.get("displayName") or "Verified Technician",
                phoneNo=w_data.get("phoneNo") or w_data.get("phoneNumber"),
                address=w_data.get("address") or w_data.get("primaryServiceArea") or "Colombo",
                workerRating=float(w_data.get("overallRating") or w_data.get("rating") or 5.0),
                completedJobs=int(w_data.get("completedJobs") or 0),
                skills=_normalize_skills(w_data.get("skills")) or ["General Handyman"],
                pricingModel=w_data.get("pricingModel") or ("Hourly" if w_data.get("hourlyRate") else "Standard")
            )
            clean_msg = _clean_card_intro_message(
                last_ai_content,
                f"Profile details for {card.displayName}:",
                "user_profile"
            )
            return AgentCardResponse(
                response_type="user_profile",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        # 11. get_worker_performance
        if tool_name == "get_worker_performance":
            perf = data if isinstance(data, dict) else {}
            rating = perf.get("overallRating") or perf.get("averageRating") or 5.0
            jobs = perf.get("completedJobs") or perf.get("totalJobs") or 0
            comp_rate = perf.get("completionRate") or "98%"
            card = TextMessageCard(
                text=last_ai_content or f"Worker Performance: ★ {rating} ({jobs} completed jobs, {comp_rate} completion rate).",
                suggestions=["Book this technician", "Check availability", "Search other workers"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "worker_matching_agent", "user_email": email}
            )

        # 12. get_resident_bookings
        if tool_name == "get_resident_bookings":
            raw_bookings = data if isinstance(data, list) else (
                data.get("bookings") or data.get("items") or [] if isinstance(data, dict) else []
            )
            if isinstance(raw_bookings, list) and raw_bookings:
                b_count = len(raw_bookings)
                card = TextMessageCard(
                    text=last_ai_content or f"You have {b_count} scheduled booking appointment(s):",
                    suggestions=["Reschedule an appointment", "Cancel a booking", "Find another worker"]
                )
            else:
                card = TextMessageCard(
                    text=last_ai_content or "You do not have any upcoming bookings at the moment.",
                    suggestions=["Find a technician", "Book a service", "View community posts"]
                )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 13. reschedule_booking
        if tool_name == "reschedule_booking":
            b_id = data.get("bookingId") or data.get("id") or ""
            card = TextMessageCard(
                text=last_ai_content or f"Booking #{b_id} has been successfully rescheduled.",
                suggestions=["View my bookings", "Contact worker", "Done"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 14. cancel_booking
        if tool_name == "cancel_booking":
            b_id = data.get("bookingId") or data.get("id") or ""
            card = TextMessageCard(
                text=last_ai_content or f"Booking #{b_id} has been canceled.",
                suggestions=["Find another worker", "View my bookings", "Create a community post"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 15. get_booking / get_booking_details
        if tool_name in ["get_booking", "get_booking_details"]:
            b_id = data.get("id") or data.get("bookingId") or ""
            status = data.get("status") or "Confirmed"
            card = TextMessageCard(
                text=last_ai_content or f"Booking #{b_id} Status: {status}.",
                suggestions=["Reschedule", "Cancel booking", "View all bookings"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        # 16. create_worker_review
        if tool_name == "create_worker_review":
            card = TextMessageCard(
                text=last_ai_content or "Thank you! Your rating and review have been submitted successfully.",
                suggestions=["Book another worker", "Browse community feed", "View profile"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        # 17. file_dispute_ticket
        if tool_name == "file_dispute_ticket":
            ticket_id = data.get("ticket_id") or data.get("id") or "D-101"
            card = TextMessageCard(
                text=last_ai_content or f"Dispute ticket #{ticket_id} has been filed. Our support team will follow up within 24 hours.",
                suggestions=["Contact human support", "Return to home"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        # 18. escalate_to_human
        if tool_name == "escalate_to_human":
            card = TextMessageCard(
                text=last_ai_content or "Your conversation has been escalated to a customer support specialist who will assist you shortly.",
                suggestions=["Return to home", "View community feed"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        # 19. get_user_job_history
        if tool_name == "get_user_job_history":
            card = TextMessageCard(
                text=last_ai_content or "Here is your recent service history:",
                suggestions=["Leave a review", "Book technician again", "File dispute"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

    # Check if this is a booking confirmation summary
    lower_content = last_ai_content.lower()
    is_booking_summary = any(kw in lower_content for kw in ["booking summary", "place this booking", "would you like me to place", "confirm this booking"])
    if is_booking_summary:
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=["Yes, please place the booking", "Change date or time", "Cancel booking"]
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email}
        )

    # Check if this is a choice turn offering finding a worker vs community post
    is_choice_turn = not is_draft and (
        any(kw in lower_content for kw in [
            "create a community post or find",
            "how would you like to proceed",
            "would you like to proceed with finding a worker or creating a community post",
            "would you like to find a worker or create a community post",
            "proceed with finding a worker"
        ]) or (
            bool((metadata or {}).get("suggested_actions"))
            and any(kw in lower_content for kw in ["how would you like to proceed", "choose an option", "select an option"])
        )
    )

    if is_choice_turn:
        dyn_suggestions = (metadata or {}).get("suggested_actions")
        if not dyn_suggestions or not isinstance(dyn_suggestions, list):
            dyn_suggestions = [
                "Find a verified service worker",
                "Create a community post"
            ]

        structured_suggestions = []
        for idx, item in enumerate(dyn_suggestions):
            if isinstance(item, dict):
                text_val = str(item.get("text") or item.get("label") or "")
                if any(t in text_val.lower() for t in ["tip", "diy", "myself", "advice", "tutorial", "guide"]):
                    continue
                structured_suggestions.append(item)
            else:
                item_str = str(item)
                if any(t in item_str.lower() for t in ["tip", "diy", "myself", "advice", "tutorial", "guide"]):
                    continue
                item_type = "community" if "community" in item_str.lower() or "post" in item_str.lower() or idx == 1 else "find"
                structured_suggestions.append({
                    "text": item_str,
                    "type": item_type
                })

        card = TextMessageCard(
            text=last_ai_content,
            suggestions=structured_suggestions
        )
        card_data = card.model_dump()
        card_data["is_choice"] = True

        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card_data,
            metadata={"agent": "supervisor", "user_email": email}
        )

    # Check if booking agent is asking for the service issue / problem (Step 2)
    if any(kw in lower_content for kw in ["what issue are you facing", "issue or service needed", "describe the issue", "describe the problem"]):
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=["Leaking pipe repair", "Tap replacement", "Pipe installation", "Bathroom plumbing fix"]
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email}
        )

    # Check if booking agent is asking for preferred date and time (Step 3)
    if any(kw in lower_content for kw in ["when would you like", "date and time", "what date", "preferred date"]):
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=["Tomorrow at 10:00 AM", "Tomorrow at 2:00 PM", "This Saturday at 11:00 AM", "Next Monday at 9:00 AM"]
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email}
        )

    # Check if booking agent is confirming registered address and phone (Step 4)
    if any(kw in lower_content for kw in ["registered address", "registered phone", "service location", "registered details"]):
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=["Yes, use my registered details", "I'd like to provide a different address"]
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email}
        )

    # Check if the assistant is asking intake questions for creating a post (do NOT trigger draft card yet)
    is_post_intake = any(kw in lower_content for kw in [
        "what specific service", "what problem", "what issue", "tell me a few details",
        "what is the problem", "tell me what problem", "what type of service",
        "service or problem are you facing", "service or issue", "share a few details",
        "what kind of service", "to get started"
    ]) and not any(kw in lower_content for kw in ["• title:", "title:"])

    if is_post_intake:
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=[
                "AC repair needed in Colombo",
                "Emergency plumber for water leak",
                "Licensed electrician needed urgently",
                "Carpentry work needed"
            ]
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "community_agent", "user_email": email}
        )

    # Check if the assistant is asking for the trade or service type (e.g. user asked "find a worker")
    is_asking_trade = any(kw in lower_content for kw in [
        "specify the type of service",
        "type of service you need",
        "what type of service",
        "what kind of service",
        "which service do you need",
        "service do you need help with",
        "what service do you need",
        "type of worker",
        "kind of worker"
    ])
    if is_asking_trade:
        card = TextMessageCard(
            text=last_ai_content,
            suggestions=[
                "Plumbing & Pipe Repair",
                "Electrical & Wiring",
                "AC Repair & Air Conditioning",
                "Cleaning & Housekeeping",
                "Carpentry & Woodwork",
                "Appliance Repair"
            ]
        )
        card_data = card.model_dump()
        card_data["is_choice"] = False
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card_data,
            metadata={"agent": "booking_agent", "user_email": email}
        )

    # Check if the assistant is asking a question (clarifying questions must never trigger choice cards!)
    is_asking_question = any(kw in lower_content for kw in [
        "specify the type of service",
        "type of service",
        "what type of service",
        "what kind of service",
        "what specific service",
        "what problem",
        "what issue",
        "tell me a few details",
        "what is the problem",
        "what date",
        "preferred date",
        "when would you like",
        "registered address",
        "registered phone"
    ])


    # Check if the assistant has prepared a community post draft awaiting confirmation
    if is_draft:
        return _build_post_confirmation_response(
            last_ai_content, email, user_name, user_profile, metadata
        )

    # General text message fallback
    suggestions = metadata.get("suggested_actions") or [
        "Book a service technician",
        "View recent community posts",
        "Create a post for AC repair",
        "Check my profile"
    ]
    card = TextMessageCard(
        text=last_ai_content or "How can I assist you with Workio home services and community posts?",
        suggestions=suggestions
    )
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "supervisor", "user_email": email}
    )


async def card_formatter_node(state: AgentState) -> Dict[str, Any]:
    """
    Deterministic UI Card Formatter Node for Workio (Legacy/Fallback).
    Pure Python: Transforms agent execution history, structured tool outputs, and state into
    strictly typed Pydantic UI Card responses (AgentCardResponse) for the React frontend.
    ZERO LLM CALLS.
    """
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

