"""
Structured Card Formatter Node for SuperBass.
Translates agent execution history and tool outputs into strictly typed Pydantic
UI Card responses (AgentCardResponse) for the frontend application.
"""

from typing import Dict, Any, List
import json
import logging
from langchain_core.messages import SystemMessage, ToolMessage
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
    WorkerSummary
)

logger = logging.getLogger("agent_backend.card_formatter")

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
10. "error": Use if a tool or operation failed with an error.
   card_data fields: errorCode, message, actionRequired.

Choose the exact response_type that best represents the latest action.
"""


def _deterministic_card_builder(state: AgentState) -> AgentCardResponse:
    """Deterministic fallback builder based on tool execution logs."""
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}
    user_name = metadata.get("user_name") or user_profile.get("displayName") or (email.split("@")[0] if "@" in email else "Resident")

    last_ai_content = ""
    for msg in reversed(messages):
        if msg.type == "ai" and msg.content:
            last_ai_content = msg.content
            break

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
            return AgentCardResponse(
                response_type="post_created",
                message=last_ai_content or f"Your community post '{card.title}' has been published successfully!",
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
                return AgentCardResponse(
                    response_type="post_detail",
                    message=last_ai_content or f"Here are the details for post #{card.id}.",
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
            return AgentCardResponse(
                response_type="post_list",
                message=last_ai_content or f"Found {len(post_summaries)} community posts.",
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
            return AgentCardResponse(
                response_type="post_updated",
                message=last_ai_content or f"Post #{card.id} has been updated.",
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 4. delete_community_post
        if tool_name == "delete_community_post":
            card = PostDeletedCard(
                id=data.get("id") or data.get("postId") or "",
                message="Community post marked as removed."
            )
            return AgentCardResponse(
                response_type="post_deleted",
                message=last_ai_content or "Post successfully removed.",
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 5. get_user_details
        if tool_name == "get_user_details":
            card = UserProfileCard(
                email=data.get("email", email),
                role=data.get("role", user_type),
                isWorker=data.get("isWorker", False),
                displayName=data.get("displayName"),
                phoneNo=data.get("phoneNo"),
                address=data.get("address"),
                skills=data.get("workerProfile", {}).get("skills") if isinstance(data.get("workerProfile"), dict) else None
            )
            return AgentCardResponse(
                response_type="user_profile",
                message=last_ai_content or f"Profile details for {card.email}",
                card_data=card.model_dump(),
                metadata={"agent": "community_agent", "user_email": email}
            )

        # 6. get_service_categories
        if tool_name == "get_service_categories":
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
            return AgentCardResponse(
                response_type="service_categories",
                message=last_ai_content or f"Here are {len(categories_raw)} official service categories available on Workio.",
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

            if worker_summaries:
                # Guarantee closest workers first
                worker_summaries.sort(key=lambda x: (x.distance is None, float('inf') if x.distance is None else x.distance))
                card = WorkerListCard(
                    category=None,
                    query=None,
                    totalCount=len(worker_summaries),
                    workers=worker_summaries
                )
                return AgentCardResponse(
                    response_type="worker_list",
                    message=last_ai_content or f"I found {len(worker_summaries)} verified professionals for you:",
                    card_data=card.model_dump(),
                    metadata={"agent": "booking_agent", "user_email": email}
                )

            card = TextMessageCard(
                text=last_ai_content or "No verified service workers found matching that criteria.",
                suggestions=["Search other categories", "Post a community request", "Check availability"]
            )
            return AgentCardResponse(
                response_type="text_message",
                message=card.text,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
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

    # Check if booking agent is asking for the service issue / problem (Step 2)
    if any(kw in lower_content for kw in ["what issue", "issue or service", "need help with", "what problem", "what service"]):
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

    # Check if the assistant is offering the choice between finding a worker and creating a community post
    is_choice_turn = any(kw in lower_content for kw in [
        "create a community post or find",
        "find a verified",
        "find an existing worker",
        "how would you like to proceed",
        "would you like to:",
        "or create a community post",
        "publish your service request to the community board"
    ])

    if is_choice_turn:
        # Use dynamic suggested actions provided by the LLM in metadata, or sensible clean defaults
        dyn_suggestions = (metadata or {}).get("suggested_actions")
        if not dyn_suggestions or not isinstance(dyn_suggestions, list):
            dyn_suggestions = [
                "Find a verified service worker",
                "Create a community post"
            ]

        card = TextMessageCard(
            text=last_ai_content,
            suggestions=dyn_suggestions
        )
        return AgentCardResponse(
            response_type="text_message",
            message=card.text,
            card_data=card.model_dump(),
            metadata={"agent": "supervisor", "user_email": email}
        )

    # Check if the assistant has prepared a community post draft awaiting confirmation
    is_draft = not is_choice_turn and (any(keyword in lower_content for keyword in ["draft", "confirm and publish", "would you like me to confirm", "would you like me to publish"]) or (
        ("title:" in lower_content or "• title" in lower_content) and ("category:" in lower_content or "• category" in lower_content)
    ))

    if is_draft:
        # Extract title, category, location, urgency, content
        draft_title = "Community Service Request"
        draft_category = "General"
        draft_location = "Colombo"
        draft_urgency = "As soon as possible"
        draft_content = ""

        for line in last_ai_content.splitlines():
            line_str = line.strip()
            line_clean = line_str.replace("•", "").strip()
            if line_clean.lower().startswith("title:"):
                draft_title = line_clean.split(":", 1)[1].strip().strip("*").strip()
            elif line_clean.lower().startswith("category:"):
                draft_category = line_clean.split(":", 1)[1].strip().strip("*").strip()
            elif line_clean.lower().startswith("location:"):
                draft_location = line_clean.split(":", 1)[1].strip().strip("*").strip()
            elif line_clean.lower().startswith("urgency:"):
                draft_urgency = line_clean.split(":", 1)[1].strip().strip("*").strip()
            elif line_clean.lower().startswith("content:") or line_clean.lower().startswith("description:"):
                draft_content = line_clean.split(":", 1)[1].strip().strip("*").strip()

        if not draft_content:
            draft_content = last_ai_content

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
        return AgentCardResponse(
            response_type="post_confirmation",
            message=last_ai_content,
            card_data=card.model_dump(),
            metadata={"agent": "community_agent", "user_email": email}
        )

    # General text message fallback
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
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "supervisor", "user_email": email}
    )


async def card_formatter_node(state: AgentState) -> Dict[str, Any]:
    """
    Card Formatter Node invokes structured output with ChatOpenAI gpt-4o-mini
    or uses the robust deterministic builder.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")

    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=0.0,
                api_key=settings.openai_api_key
            )
            structured_formatter = llm.with_structured_output(AgentCardResponse, method="function_calling")

            format_messages = [
                SystemMessage(content=CARD_FORMATTER_PROMPT),
                SystemMessage(content=f"Active user: email={email}, role={user_type}")
            ] + messages

            card_response: AgentCardResponse = await structured_formatter.ainvoke(format_messages)
            if card_response:
                return {"structured_response": card_response}
        except Exception as e:
            logger.warning(f"Structured card formatter LLM error: {e}. Falling back to deterministic builder.")

    # Fallback deterministic builder
    fallback_response = _deterministic_card_builder(state)
    return {"structured_response": fallback_response}
