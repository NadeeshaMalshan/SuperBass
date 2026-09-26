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
    TextMessageCard,
    ErrorCard,
    CommunityPostSummary
)

logger = logging.getLogger("agent_backend.card_formatter")

CARD_FORMATTER_PROMPT = """You are the Frontend UI Card Formatter for SuperBass.
Your role is to format the conversation output and any tool results into a structured AgentCardResponse JSON object so the Frontend can render the appropriate interactive UI card component.

Available response_type values and their corresponding card_data schemas:
0. "post_confirmation": Use whenever a community post draft is formulated and presented for user review/confirmation before publishing or updating.
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
7. "text_message": Use for conversational replies, greetings, explanations, or questions.
   card_data fields: text, suggestions (list of quick prompt suggestions).
8. "error": Use if a tool or operation failed with an error.
   card_data fields: errorCode, message, actionRequired.

Choose the exact response_type that best represents the latest action.
"""


def _deterministic_card_builder(state: AgentState) -> AgentCardResponse:
    """Deterministic fallback builder based on tool execution logs."""
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@superbass.lk")
    user_type = state.get("user_type", "Resident")

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
            categories_list = data if isinstance(data, list) else (data.get("value") if isinstance(data, dict) else [])
            return AgentCardResponse(
                response_type="service_categories",
                message=last_ai_content or f"Here are the official service categories available on SuperBass:",
                card_data={"categories": categories_list},
                metadata={"agent": "community_agent", "user_email": email}
            )

    # Check if the assistant has prepared a post draft awaiting confirmation
    lower_content = last_ai_content.lower()
    if any(keyword in lower_content for keyword in ["draft", "confirm", "review", "would you like me to publish"]):
        # Extract title or default
        draft_title = "Community Service Request"
        draft_category = "General"
        draft_location = "Colombo"

        for line in last_ai_content.splitlines():
            line_str = line.strip()
            if "title:" in line_str.lower():
                draft_title = line_str.split(":", 1)[1].strip().strip("*").strip()
            elif "category:" in line_str.lower():
                draft_category = line_str.split(":", 1)[1].strip().strip("*").strip()
            elif "location:" in line_str.lower():
                draft_location = line_str.split(":", 1)[1].strip().strip("*").strip()

        card = PostConfirmationCard(
            action="create",
            title=draft_title,
            content=last_ai_content,
            communityId=draft_category,
            location=draft_location,
            validationStatus="valid",
            validationNotes="Please review your draft details above and confirm to publish.",
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
        "View recent community posts",
        "Create a post for AC repair",
        "Show my posts",
        "Check my profile"
    ]
    card = TextMessageCard(
        text=last_ai_content or "How can I assist you with SuperBass community posts?",
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
    email = state.get("email", "resident@superbass.lk")
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
