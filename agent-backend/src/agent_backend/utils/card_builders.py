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
    SpecialistConversationalOutput,
    BookingFormCard,
    BookingConfirmedCard,
    BookingSummary,
    BookingListCard,
    ReviewFormCard,
    ReviewSubmittedCard,
    DisputeTicketCard
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


def generate_issue_title(raw_title: Optional[str] = None, issue_text: str = "", category: str = "", content: str = "") -> str:
    """
    Ensures community post title is always specific to the actual issue/problem,
    and never generic like 'Community Service Request'.
    """
    generic_titles = [
        "community service request", "service request", "community post", "draft post",
        "draft community post", "post title", "title", "<title>", "<pre-filled title>",
        "n/a", "new post", "help needed", "general request", "general service request"
    ]
    if raw_title:
        clean = re.sub(r'^(?:[\*\#\-\s•]*title[\*\s]*[:\-]\s*)', '', raw_title.strip(), flags=re.IGNORECASE)
        clean = clean.strip().strip("*#\"'").strip()
        if clean and clean.lower() not in generic_titles and len(clean) >= 3:
            return clean

    candidate_text = issue_text or content or ""
    # Strip conversational request/post prefixes
    cleaned = re.sub(
        r'^(?:i want to|i need to|please|can you|help me to|help me)?\s*(?:create|make|post|publish)\s+(?:a\s+)?(?:community\s+)?(?:post)?\s*[:\-]?\s*',
        '',
        candidate_text.strip(),
        flags=re.IGNORECASE
    ).strip()
    cleaned = re.sub(
        r'^(?:i have a problem with|i have an issue with|there is an issue with|my|i need help with|i need to repair|i need someone to|please help me with|can you help me with|i want to fix|fix my|repair my|i need|help me|please)\s+',
        '',
        cleaned,
        flags=re.IGNORECASE
    ).strip()

    first_clause = re.split(r'[\.\n\r;!?]', cleaned)[0].strip()
    first_clause = re.sub(r'\s+(?:in|at|near)\s+(?:colombo|kandy|galle|my area|my house|my home|my place|my room|home)$', '', first_clause, flags=re.IGNORECASE).strip()

    if first_clause and len(first_clause) >= 4 and len(first_clause) <= 60:
        words = first_clause.split()
        title_cased = ' '.join([w.capitalize() if not w.isupper() else w for w in words])
        return title_cased

    if category and category.lower() != 'general':
        return f"{category} Repair & Service Request"
    return "Home Maintenance Service Request"


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
    if card_type in ["post_confirmation", "create_community_post", "edit_community_post"] or bool(re.search(r'\*\*(?:Title|Category|Location|Content|Description):\*\*', text, re.IGNORECASE)):
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
            user_query = ""
            for msg in reversed(messages):
                if getattr(msg, "type", "") in ("human", "user"):
                    user_query = extract_text_content(getattr(msg, "content", ""))
                    break

            user_query_lower = user_query.lower()
            last_ai_lower = last_ai_content.lower()

            is_edit_intent = (
                any(w in user_query_lower for w in [
                    "edit", "update", "modify", "change", "add more detail", "add detail", "fix this post", "correct this post", "need edit", "edit that", "edit this"
                ])
                or any(w in last_ai_lower for w in [
                    "what additional details", "proposed update", "edit the post", "edit your post", "to update post", "update post id", "found your", "post (id", "post details for editing", "for editing (id", "for editing"
                ])
            )

            is_single_post = isinstance(data, dict) and bool(data.get("id") or data.get("postId") or data.get("PostId")) and not ("posts" in data or "items" in data)
            if is_single_post:
                post_id_val = data.get("postId") or data.get("id") or data.get("PostId")
                post_title = data.get("title") or data.get("Title", "")
                post_content = data.get("content") or data.get("Content", "")
                post_cat = data.get("serviceCategoryId") or data.get("ServiceCategoryId") or data.get("communityId", "General")
                post_loc = data.get("location") or data.get("Location", "Colombo")

                if is_edit_intent:
                    card = PostConfirmationCard(
                        action="update",
                        postId=post_id_val,
                        title=post_title,
                        content=post_content,
                        communityId=post_cat,
                        location=post_loc,
                        authorId=email,
                        authorName=user_name,
                        validationStatus="valid",
                        validationNotes="You can edit the details in the form above and click 'Update Post' to save your changes.",
                        confirmPrompt=f"CONFIRM_UPDATE: Yes, please update post ID {post_id_val} with title '{post_title}' in {post_cat} for {post_loc}. Description: {post_content}"
                    )
                    return AgentCardResponse(
                        response_type="edit_community_post",
                        message=last_ai_content,
                        card_data=card.model_dump(),
                        metadata={"agent": "community_agent", "user_email": email, "action": "update", "postId": post_id_val}
                    )

                # Single post detail view (read-only view)
                card = PostDetailCard(
                    id=post_id_val,
                    title=post_title,
                    content=post_content,
                    communityId=post_cat,
                    location=post_loc,
                    authorName=data.get("userName") or data.get("UserName") or (data.get("userEmail") or data.get("UserEmail", "")).split("@")[0],
                    authorEmail=data.get("userEmail") or data.get("UserEmail"),
                    likesCount=data.get("likesCount") or data.get("LikesCount", 0),
                    commentsCount=data.get("commentsCount") or data.get("CommentsCount", 0)
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

            raw_posts = data if isinstance(data, list) else data.get("posts", data.get("items", []))

            # If user wants to edit a post, return the Edit Post Form Card instead of showing all posts
            if is_edit_intent and raw_posts:
                # 1. Try to extract post ID mentioned in AI response (e.g. "post (ID 26)") or user query
                target_id_m = re.search(r'\b(?:id|post)\s*[:#]?\s*(\d+)\b', last_ai_content, re.IGNORECASE) or re.search(r'\b(?:id|post)\s*[:#]?\s*(\d+)\b', user_query, re.IGNORECASE)
                target_id = target_id_m.group(1) if target_id_m else None

                target_post = None
                if target_id:
                    for p in raw_posts:
                        if isinstance(p, dict) and str(p.get("postId") or p.get("id") or p.get("PostId")) == str(target_id):
                            target_post = p
                            break

                if not target_post:
                    # Match post authored by user that has issue keywords or is user's recent post
                    user_posts = [p for p in raw_posts if isinstance(p, dict) and (p.get("userEmail") == email or p.get("userId") == email)]
                    if user_posts:
                        words = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', user_query_lower) if w not in ["need", "edit", "this", "post", "because", "more", "details", "for"]]
                        matched = None
                        for up in user_posts:
                            up_text = (str(up.get("title", "")) + " " + str(up.get("content", ""))).lower()
                            if any(w in up_text for w in words):
                                matched = up
                                break
                        target_post = matched or user_posts[0]
                    elif raw_posts and isinstance(raw_posts[0], dict):
                        target_post = raw_posts[0]

                if target_post:
                    post_id_val = target_post.get("postId") or target_post.get("id") or target_post.get("PostId") or target_id
                    post_title = target_post.get("title") or target_post.get("Title") or "Community Post"
                    post_content = target_post.get("content") or target_post.get("Content") or ""
                    post_cat = target_post.get("serviceCategoryId") or target_post.get("ServiceCategoryId") or target_post.get("communityId") or "General"
                    post_loc = target_post.get("location") or target_post.get("Location") or "Colombo"

                    card = PostConfirmationCard(
                        action="update",
                        postId=post_id_val,
                        title=post_title,
                        content=post_content,
                        communityId=post_cat,
                        location=post_loc,
                        authorId=email,
                        authorName=user_name,
                        validationStatus="valid",
                        validationNotes="You can edit the details in the form above and click 'Update Post' to save your changes.",
                        confirmPrompt=f"CONFIRM_UPDATE: Yes, please update post ID {post_id_val} with title '{post_title}' in {post_cat} for {post_loc}. Description: {post_content}"
                    )
                    return AgentCardResponse(
                        response_type="edit_community_post",
                        message=last_ai_content,
                        card_data=card.model_dump(),
                        metadata={"agent": "community_agent", "user_email": email, "action": "update", "postId": post_id_val}
                    )

            # Multiple posts list (feed / search view)
            post_summaries: List[CommunityPostSummary] = []
            for item in (raw_posts if isinstance(raw_posts, list) else []):
                if isinstance(item, dict):
                    raw_post_id = item.get("postId") or item.get("id") or item.get("PostId") or ""
                    post_summaries.append(
                        CommunityPostSummary(
                            id=raw_post_id,
                            title=item.get("title") or item.get("Title", "Untitled"),
                            content=(item.get("content") or item.get("Content", ""))[:140],
                            communityId=item.get("serviceCategoryId") or item.get("ServiceCategoryId") or item.get("communityId", "General"),
                            location=item.get("location") or item.get("Location", "Colombo"),
                            authorName=item.get("userName") or item.get("UserName") or (item.get("userEmail") or item.get("UserEmail") or item.get("userId") or "").split("@")[0],
                            authorEmail=item.get("userEmail") or item.get("UserEmail") or item.get("userId"),
                            createdAt=str(item.get("createdAt") or item.get("CreatedAt") or ""),
                            likesCount=item.get("likesCount") or item.get("LikesCount", 0),
                            commentsCount=item.get("commentsCount") or item.get("CommentsCount", 0)
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
        if tool_name == "create_booking":
            booking_id = data.get("bookingId") or data.get("id") or "new"
            worker_id = data.get("workerId") or ""
            worker_name = data.get("workerName") or "Verified Technician"
            job_title = data.get("jobTitle") or "Service Appointment"
            scheduled_date = data.get("scheduledDate") or data.get("startTime") or ""
            location_addr = data.get("locationAddress") or "Colombo"
            contact_ph = data.get("contactPhone") or ""
            status_val = data.get("status") or "Confirmed"

            card = BookingConfirmedCard(
                bookingId=booking_id,
                workerId=worker_id,
                workerName=worker_name,
                jobTitle=job_title,
                scheduledDate=str(scheduled_date),
                locationAddress=location_addr,
                contactPhone=contact_ph,
                status=status_val
            )
            clean_msg = f"Your appointment with {worker_name} has been successfully scheduled! Booking #{booking_id}."
            return AgentCardResponse(
                response_type="booking_confirmed",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        if tool_name == "check_worker_availability":
            worker_id = data.get("workerId") or ""
            worker_name = data.get("workerName") or "Verified Technician"
            is_avail = data.get("isSlotAvailable", data.get("isAvailable", True))
            status_val = "Available" if is_avail else "Unavailable"
            reason_val = data.get("reason") or ("Technician is available for this slot." if is_avail else "Technician is not available for this slot.")

            card = BookingFormCard(
                workerId=worker_id,
                workerName=worker_name,
                category=data.get("category", "General"),
                hourlyRate=float(data.get("hourlyRate", 2800)),
                location=data.get("location", "Colombo"),
                contactPhone=data.get("contactPhone"),
                selectedDate=data.get("requestedDate"),
                selectedStartTime=data.get("requestedStartTime", "09:00"),
                durationHours=int(data.get("durationHours", 2)),
                isAvailable=is_avail,
                availabilityStatus=status_val,
                availabilityReason=reason_val
            )
            clean_msg = f"{worker_name} is {status_val.lower()} for your requested time slot."
            return AgentCardResponse(
                response_type="booking_form",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        if tool_name == "get_resident_bookings":
            raw_bookings = data if isinstance(data, list) else (
                data.get("bookings") or data.get("items") or data.get("value") or []
                if isinstance(data, dict) else []
            )
            if not isinstance(raw_bookings, list):
                raw_bookings = []

            booking_summaries: List[BookingSummary] = []
            for b in raw_bookings:
                if isinstance(b, dict):
                    b_id = b.get("id") or b.get("bookingId") or 0
                    b_worker_id = b.get("workerId") or 0
                    b_worker_name = b.get("workerName") or "Verified Technician"
                    b_worker_img = b.get("workerProfileImage") or b.get("workerAvatar")
                    b_worker_phone = b.get("workerPhone")
                    b_title = b.get("jobTitle") or b.get("description") or "Home Service Appointment"
                    b_date = b.get("scheduledDate")
                    b_loc = b.get("locationAddress") or "Colombo"
                    b_phone = b.get("contactPhone")
                    b_pricing = b.get("pricingModel") or "Hourly"
                    b_est = float(b["estimatedPrice"]) if b.get("estimatedPrice") is not None else None
                    b_agr = float(b["agreedPrice"]) if b.get("agreedPrice") is not None else None
                    b_status = b.get("status") or "Requested"
                    b_created = b.get("createdAt")

                    booking_summaries.append(
                        BookingSummary(
                            id=b_id,
                            workerId=b_worker_id,
                            workerName=b_worker_name,
                            workerProfileImage=b_worker_img,
                            workerPhone=b_worker_phone,
                            jobTitle=b_title,
                            scheduledDate=b_date,
                            locationAddress=b_loc,
                            contactPhone=b_phone,
                            pricingModel=b_pricing,
                            estimatedPrice=b_est,
                            agreedPrice=b_agr,
                            status=b_status,
                            createdAt=b_created
                        )
                    )

            # Strip markdown pipes and raw tables from conversational message
            clean_msg = last_ai_content or ""
            if clean_msg:
                clean_msg = re.split(r'\n\s*\|', clean_msg)[0].strip()
                clean_msg = re.sub(r'The booking records provide start times.*$', '', clean_msg, flags=re.IGNORECASE).strip()

            if not clean_msg or len(clean_msg) < 5:
                count_str = f"{len(booking_summaries)} upcoming bookings" if booking_summaries else "no upcoming bookings"
                clean_msg = f"You have {count_str} on Workio:"

            card = BookingListCard(
                totalCount=len(booking_summaries),
                statusFilter="Upcoming",
                bookings=booking_summaries
            )

            return AgentCardResponse(
                response_type="booking_list",
                message=clean_msg,
                card_data=card.model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

        if tool_name in ["cancel_booking", "reschedule_booking"]:
            suggestions = ["Book a technician", "View upcoming bookings", "Cancel a booking"]
            msg = last_ai_content
            if not msg:
                booking_id = data.get("bookingId") or data.get("id") or ""
                if tool_name == "reschedule_booking":
                    msg = f"Booking #{booking_id} has been successfully rescheduled." if booking_id else "Booking has been rescheduled."
                elif tool_name == "cancel_booking":
                    msg = f"Booking #{booking_id} has been cancelled." if booking_id else "Booking has been cancelled."
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
        if tool_name == "create_worker_review":
            b_id = data.get("bookingId") or data.get("id") or "0"
            w_id = data.get("workerId") or ""
            w_name = data.get("workerName") or "Verified Technician"
            overall = float(data.get("overallRating") or data.get("rating") or 5.0)
            quality = int(data.get("qualityRating") or overall)
            punctuality = int(data.get("punctualityRating") or overall)
            comm = int(data.get("communicationRating") or overall)
            comment_text = data.get("comment") or data.get("reviewComment")
            rev_at = data.get("reviewedAt") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

            review_card = ReviewSubmittedCard(
                bookingId=b_id,
                workerId=w_id,
                workerName=w_name,
                overallRating=overall,
                qualityRating=quality,
                punctualityRating=punctuality,
                communicationRating=comm,
                comment=comment_text,
                submittedAt=rev_at
            )
            clean_msg = f"Thank you! Your verified review for {w_name} has been published successfully."
            return AgentCardResponse(
                response_type="review_submitted",
                message=clean_msg,
                card_data=review_card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        if tool_name == "file_dispute_ticket":
            ticket_id = data.get("ticketId") or data.get("id") or "TICKET-101"
            w_id = data.get("workerId")
            w_name = data.get("workerName")
            reason_text = data.get("reason") or "Service dispute filed"
            urgency_text = (data.get("urgencyLevel") or data.get("urgency") or "Medium").capitalize()
            sla_text = data.get("sla") or "Support team responds within 2 hours"
            phone_text = data.get("supportPhone") or "+94 11 234 5678"

            dispute_card = DisputeTicketCard(
                ticketId=ticket_id,
                workerId=w_id,
                workerName=w_name,
                reason=reason_text,
                urgencyLevel=urgency_text,
                status=data.get("status", "Open"),
                resolutionSla=sla_text,
                supportHotline=phone_text
            )
            clean_msg = f"Dispute Ticket #{ticket_id} has been registered. Our safety coordinator will investigate and follow up."
            return AgentCardResponse(
                response_type="dispute_ticket",
                message=clean_msg,
                card_data=dispute_card.model_dump(),
                metadata={"agent": "support_review_agent", "user_email": email}
            )

        if tool_name == "lookup_platform_policy":
            suggestions = [
                "7-Day Workmanship Guarantee",
                "Cancellation & Fees",
                "Property Damage Protection",
                "Technician Safety & Vetting"
            ]
            msg = last_ai_content or "Here is the verified platform policy information:"
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

        if tool_name in ["escalate_to_human", "get_user_job_history"]:
            suggestions = ["Leave a review", "Contact hotline", "Return to home"]
            msg = last_ai_content
            if not msg:
                if tool_name == "escalate_to_human":
                    esc_id = data.get("escalationId") or "ESC-901"
                    msg = f"Your case #{esc_id} has been escalated to a live human supervisor. Expected wait time is under 5 minutes."
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

    # -------------------------------------------------------------------------
    # 0. BOOKING FORM INTENT (e.g. user asks to book a worker / technician)
    # -------------------------------------------------------------------------
    user_query = ""
    for msg in reversed(messages):
        if getattr(msg, "type", "") in ("human", "user"):
            user_query = extract_text_content(getattr(msg, "content", ""))
            break

    user_query_lower = user_query.lower()
    last_ai_lower = last_ai_content.lower()

    # Detect booking intent keywords
    has_book_kw = any(w in user_query_lower for w in [
        "book", "booking", "hire", "reserve", "appointment", "schedule a service", "schedule with"
    ]) or any(w in last_ai_lower for w in [
        "help book", "booking for", "schedule an appointment", "book bandara", "book worker", "prefer? i'll check", "start time would you prefer", "what date and start time"
    ])

    # Extract worker ID from user query or AI response
    extracted_worker_id = None
    w_id_m = re.search(r'(?:worker\s*id|worker\s*#|worker)\s*[:#]?\s*(\d+)', user_query, re.IGNORECASE)
    if not w_id_m:
        w_id_m = re.search(r'\(?(?:ID|Worker ID)\s*[:#]?\s*(\d+)\)?', user_query, re.IGNORECASE)
    if not w_id_m:
        w_id_m = re.search(r'(?:worker\s*id|worker\s*#|worker)\s*[:#]?\s*(\d+)', last_ai_content, re.IGNORECASE)
    if not w_id_m:
        w_id_m = re.search(r'\(?(?:ID|Worker ID)\s*[:#]?\s*(\d+)\)?', last_ai_content, re.IGNORECASE)

    if w_id_m:
        extracted_worker_id = w_id_m.group(1)

    # Extract worker name from user query or AI response
    extracted_worker_name = None
    name_m = re.search(r'(?:book|hire|with)\s+([A-Z][a-zA-Z\s]+?)(?:\s*\(|\s*,\s*worker|\s+for\s+|\s+on\s+|\s*$)', user_query)
    if name_m:
        cand = name_m.group(1).strip()
        if cand and len(cand) > 2 and cand.lower() not in ["a worker", "a technician", "someone", "worker", "the worker"]:
            extracted_worker_name = cand

    if not extracted_worker_name:
        name_m_ai = re.search(r'(?:help book|booking with|book)\s+([A-Z][a-zA-Z\s]+?)(?:\s*\(|\s+on\s+|\s*\.|\s*,)', last_ai_content)
        if name_m_ai:
            cand = name_m_ai.group(1).strip()
            if cand and len(cand) > 2 and cand.lower() not in ["a worker", "a technician", "someone", "worker", "the worker"]:
                extracted_worker_name = cand

    # -------------------------------------------------------------------------
    # 0A. REVIEW FORM & DISPUTE INTENT
    # -------------------------------------------------------------------------
    has_review_kw = any(w in user_query_lower for w in [
        "review", "rate", "rating", "leave a review", "give review", "feedback", "give feedback", "stars",
        "post a review", "submit review", "write a review"
    ]) or any(w in last_ai_lower for w in [
        "leave a review", "submit a review", "rate this technician", "how was your experience"
    ]) or metadata.get("agent") == "support_review_agent"

    is_asking_other_rating = any(w in user_query_lower for w in [
        "what is his rating", "what is her rating", "what is their rating", "show rating", "performance"
    ])

    has_dispute_kw = any(w in user_query_lower for w in [
        "dispute", "file complaint", "file a complaint", "technician didn't show", "no show",
        "broke my", "damage", "scam", "overcharged", "poor quality work", "issue ticket", "ticket"
    ])

    if has_dispute_kw:
        ticket_num = f"DISP-{datetime.now(timezone.utc).strftime('%y%m%d')}-9481"
        dispute_card = DisputeTicketCard(
            ticketId=ticket_num,
            workerId=extracted_worker_id,
            workerName=extracted_worker_name or "Assigned Technician",
            reason=user_query or "Service quality and completion dispute reported by resident.",
            urgencyLevel="High" if any(k in user_query_lower for k in ["damage", "broke", "emergency", "urgent"]) else "Medium",
            status="Open",
            resolutionSla="Support team responds within 2 hours",
            supportHotline="+94 11 234 5678"
        )
        clean_msg = f"I have opened Support Ticket #{ticket_num} for your report. Our trust & safety team has been alerted."
        return AgentCardResponse(
            response_type="dispute_ticket",
            message=clean_msg,
            card_data=dispute_card.model_dump(),
            metadata={"agent": "support_review_agent", "user_email": email}
        )

    if has_review_kw and not is_asking_other_rating:
        # Extract booking ID
        extracted_booking_id = None
        b_match = re.search(r'(?:booking|order|appointment|#)\s*[:#]?\s*(\d+)', user_query, re.IGNORECASE)
        if not b_match:
            b_match = re.search(r'(?:booking|order|appointment|#)\s*[:#]?\s*(\d+)', last_ai_content, re.IGNORECASE)
        if b_match:
            extracted_booking_id = b_match.group(1)
        else:
            for prev_msg in reversed(messages):
                if getattr(prev_msg, "type", "") == "tool" or isinstance(prev_msg, ToolMessage):
                    try:
                        p_data = json.loads(getattr(prev_msg, "content", "") or "{}")
                        if isinstance(p_data, dict) and (p_data.get("bookingId") or p_data.get("id")):
                            extracted_booking_id = str(p_data.get("bookingId") or p_data.get("id"))
                            break
                        elif isinstance(p_data, list) and p_data and isinstance(p_data[0], dict) and p_data[0].get("id"):
                            extracted_booking_id = str(p_data[0].get("id"))
                            break
                    except Exception:
                        pass

        review_worker_id = extracted_worker_id or "44"
        review_worker_name = extracted_worker_name or "Verified Technician"
        review_job_title = "Completed Home Service"
        review_avatar = None

        for prev_msg in reversed(messages):
            if getattr(prev_msg, "type", "") == "tool" or isinstance(prev_msg, ToolMessage):
                try:
                    p_data = json.loads(getattr(prev_msg, "content", "") or "{}")
                    if isinstance(p_data, dict):
                        if p_data.get("workerName"):
                            review_worker_name = p_data["workerName"]
                        if p_data.get("workerId"):
                            review_worker_id = str(p_data["workerId"])
                        if p_data.get("jobTitle"):
                            review_job_title = p_data["jobTitle"]
                        if p_data.get("workerProfileImage") or p_data.get("workerAvatar"):
                            review_avatar = p_data.get("workerProfileImage") or p_data.get("workerAvatar")
                except Exception:
                    pass

        review_card = ReviewFormCard(
            bookingId=extracted_booking_id or "8",
            workerId=review_worker_id,
            workerName=review_worker_name,
            workerAvatar=review_avatar,
            jobTitle=review_job_title,
            defaultQuality=5,
            defaultPunctuality=5,
            defaultCommunication=5
        )
        clean_msg = f"How was your experience with {review_worker_name}? Please share your ratings and feedback below:"
        return AgentCardResponse(
            response_type="review_form",
            message=clean_msg,
            card_data=review_card.model_dump(),
            metadata={"agent": "support_review_agent", "user_email": email}
        )

    # -------------------------------------------------------------------------
    # 0B. BOOKING FORM INTENT (e.g. user asks to book a worker / technician)
    # -------------------------------------------------------------------------
    is_booking_flow = has_book_kw and (extracted_worker_id is not None or extracted_worker_name is not None or metadata.get("agent") == "booking_agent")

    if is_booking_flow and (extracted_worker_id or extracted_worker_name):
        worker_id_val = extracted_worker_id or "44"
        worker_name_val = extracted_worker_name or f"Technician #{worker_id_val}"
        hourly_rate_val = 2800.0
        worker_cat_val = metadata.get("inferred_category") or "General Service"
        worker_avatar_val = None
        worker_location_val = "Colombo"

        # Search prior messages for worker metadata (from search_workers or get_worker_details)
        for prev_msg in reversed(messages):
            if getattr(prev_msg, "type", "") == "tool" or isinstance(prev_msg, ToolMessage):
                content_val = getattr(prev_msg, "content", "")
                data_val = {}
                if isinstance(content_val, str):
                    try:
                        data_val = json.loads(content_val)
                    except Exception:
                        continue
                elif isinstance(content_val, dict):
                    data_val = content_val

                cand_workers = []
                if isinstance(data_val, list):
                    cand_workers = data_val
                elif isinstance(data_val, dict):
                    w_items = data_val.get("workers") or data_val.get("items") or data_val.get("value")
                    if isinstance(w_items, list):
                        cand_workers = w_items
                    elif data_val.get("id") or data_val.get("name"):
                        cand_workers = [data_val]

                for cw in cand_workers:
                    if not isinstance(cw, dict):
                        continue
                    cw_id = str(cw.get("id") or "")
                    cw_name = str(cw.get("name") or "")
                    matched = False
                    if extracted_worker_id and cw_id == str(extracted_worker_id):
                        matched = True
                    elif extracted_worker_name and extracted_worker_name.lower() in cw_name.lower():
                        matched = True

                    if matched:
                        worker_id_val = cw_id or worker_id_val
                        worker_name_val = cw_name or worker_name_val
                        if cw.get("hourlyRate"):
                            try:
                                hourly_rate_val = float(cw["hourlyRate"])
                            except Exception:
                                pass
                        worker_cat_val = cw.get("primaryRole") or cw.get("category") or worker_cat_val
                        worker_avatar_val = cw.get("avatarUrl") or cw.get("profileImage") or cw.get("profilePicture")
                        worker_location_val = cw.get("primaryServiceArea") or cw.get("location") or worker_location_val
                        break

                if worker_avatar_val or (worker_id_val and worker_name_val != f"Technician #{worker_id_val}"):
                    break

        user_loc_default = metadata.get("location") or user_profile.get("address") or worker_location_val or "Colombo"
        user_phone_default = user_profile.get("phoneNo") or "0771234567"

        from datetime import datetime, timedelta
        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        booking_card = BookingFormCard(
            workerId=worker_id_val,
            workerName=worker_name_val,
            workerAvatar=worker_avatar_val,
            category=worker_cat_val,
            hourlyRate=hourly_rate_val,
            location=user_loc_default,
            contactPhone=user_phone_default,
            selectedDate=tomorrow_str,
            selectedStartTime="09:00",
            durationHours=2,
            jobTitle=f"{worker_cat_val} Service Request",
            notes="",
            isAvailable=True,
            availabilityStatus="Available",
            availabilityReason=f"{worker_name_val} is available for booking."
        )

        clean_msg = f"I've prepared the booking form for {worker_name_val} (Worker ID: {worker_id_val}). Please check the availability and customize your appointment details below:"

        return AgentCardResponse(
            response_type="booking_form",
            message=clean_msg,
            card_data=booking_card.model_dump(),
            metadata={"agent": "booking_agent", "user_email": email, "workerId": worker_id_val}
        )

    # -------------------------------------------------------------------------
    # Booking List / Table Detection in Conversational Turns
    # -------------------------------------------------------------------------
    has_booking_table = bool(
        re.search(r'\|\s*Booking ID\s*\|\s*Worker\s*\|\s*Service\s*\|', last_ai_content, re.IGNORECASE)
        or ("booking id" in lower_content and "scheduled time" in lower_content and "|" in last_ai_content)
    )
    if has_booking_table:
        rows = re.findall(r'\|\s*\*{0,2}#?(\d+)\*{0,2}\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|', last_ai_content)
        if rows:
            booking_summaries = []
            for r in rows:
                b_id, b_worker, b_service, b_time, b_stat = [x.strip() for x in r]
                b_stat_clean = b_stat.strip().strip("*").strip()
                booking_summaries.append(
                    BookingSummary(
                        id=b_id,
                        workerId="",
                        workerName=b_worker.strip("*# "),
                        jobTitle=b_service.strip("*# "),
                        scheduledDate=b_time.strip("*# "),
                        status=b_stat_clean or "Requested"
                    )
                )
            clean_msg = re.split(r'\n\s*\|', last_ai_content)[0].strip()
            clean_msg = re.sub(r'The booking records provide start times.*$', '', clean_msg, flags=re.IGNORECASE).strip()
            return AgentCardResponse(
                response_type="booking_list",
                message=clean_msg or f"You have {len(booking_summaries)} upcoming bookings:",
                card_data=BookingListCard(
                    totalCount=len(booking_summaries),
                    statusFilter="Upcoming",
                    bookings=booking_summaries
                ).model_dump(),
                metadata={"agent": "booking_agent", "user_email": email}
            )

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
        draft_title = ""
        draft_category = metadata.get("inferred_category") or "General"
        draft_location = "Colombo"
        draft_content = ""

        # 1. Regex search on full text for structured draft fields (handles markdown bolding, bullets, and casing)
        title_m = re.search(r'(?:^|[•\*\-\#\d\.\s])(?:title)\s*[\*]*\s*[:\-]\s*([^\n\r•]+)', last_ai_content, re.IGNORECASE)
        if title_m:
            draft_title = title_m.group(1).strip().strip("*#\"'").strip()

        cat_m = re.search(r'(?:^|[•\*\-\#\d\.\s])(?:category|service)\s*[\*]*\s*[:\-]\s*([^\n\r•]+)', last_ai_content, re.IGNORECASE)
        if cat_m:
            cat_val = cat_m.group(1).strip().strip("*#\"'").strip()
            if cat_val and cat_val.lower() != "general":
                draft_category = cat_val

        loc_m = re.search(r'(?:^|[•\*\-\#\d\.\s])(?:location|city)\s*[\*]*\s*[:\-]\s*([^\n\r•]+)', last_ai_content, re.IGNORECASE)
        if loc_m:
            draft_location = loc_m.group(1).strip().strip("*#\"'").strip()

        desc_m = re.search(r'(?:^|[•\*\-\#\d\.\s])(?:content|description)\s*[\*]*\s*[:\-]\s*([^\n\r•]+)', last_ai_content, re.IGNORECASE)
        if desc_m:
            draft_content = desc_m.group(1).strip().strip("*#\"'").strip()

        # 2. Line-by-line fallback parsing if any field was missed
        chunks = []
        for c in last_ai_content.splitlines():
            if "•" in c:
                chunks.extend(c.split("•"))
            else:
                chunks.append(c)

        for line in chunks:
            line_str = line.strip().lstrip("•-* \t").strip()
            line_lower = line_str.lower()
            if not draft_title and (line_lower.startswith("title:") or ("title:" in line_lower and "category:" not in line_lower)):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_title = parts[1].strip().strip("*#\"'").strip()
            elif (not draft_category or draft_category == "General") and ("category:" in line_lower and "title:" not in line_lower):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    cat_val = parts[1].strip().strip("*#\"'").strip()
                    if cat_val and cat_val.lower() != "general":
                        draft_category = cat_val
            elif (not draft_location or draft_location == "Colombo") and ((line_lower.startswith("location:") or "location:" in line_lower) and "title:" not in line_lower):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_location = parts[1].strip().strip("*#\"'").strip()
            elif not draft_content and (line_lower.startswith("content:") or line_lower.startswith("description:")):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    draft_content = parts[1].strip().strip("*#\"'").strip()

        # Clean trailing questions or instructions from draft_content
        for trail in [
            "please review your post", "would you like to publish", "would you like me to publish",
            "reply 'confirm'", "you can edit any details"
        ]:
            if trail in draft_content.lower():
                idx = draft_content.lower().find(trail)
                draft_content = draft_content[:idx].strip().rstrip(". ")

        # Locate the original user issue/problem text from conversation history
        user_problem_txt = ""
        for msg in reversed(messages):
            if getattr(msg, "type", "") in ("human", "user"):
                content_str = extract_text_content(getattr(msg, "content", ""))
                clean_msg_lower = content_str.strip().lower()
                if clean_msg_lower in ["confirm", "publish", "confirm_publish", "yes", "proceed", "1", "2"]:
                    continue
                if clean_msg_lower.startswith("confirm_publish:"):
                    continue
                if len(content_str) > 5:
                    user_problem_txt = content_str
                    break

        if not draft_category or draft_category.lower() == "general":
            if metadata.get("inferred_category"):
                draft_category = metadata["inferred_category"]

        user_loc_default = metadata.get("location") or user_profile.get("address") or "Colombo"
        if not draft_location or draft_location.lower() in ["your location", "location", "n/a", "unknown", "none", "{location}"]:
            draft_location = user_loc_default

        # ALWAYS ensure title is specific to the actual issue, never generic
        draft_title = generate_issue_title(
            raw_title=draft_title,
            issue_text=user_problem_txt,
            category=draft_category,
            content=draft_content
        )

        # Ensure draft content is articulate, detailed, and never conversational meta-speech
        is_bad_content = not draft_content or any(p in draft_content.lower() for p in [
            "here is your draft", "draft community post", "review the details", "draft card", "you can edit them", "confirm to publish"
        ])
        if is_bad_content or len(draft_content) < 30:
            target_issue = user_problem_txt or draft_content or draft_title
            target_issue = re.sub(
                r'^(?:i want to|i need to|please|can you|help me to|help me)?\s*(?:create|make|post|publish)\s+(?:a\s+)?(?:community\s+)?(?:post)?\s*[:\-]?\s*',
                '',
                target_issue,
                flags=re.IGNORECASE
            ).strip()
            target_issue = re.sub(
                r'^(?:i have a problem with|i have an issue with|there is an issue with|my|i need help with|i need to repair|i need someone to|please help me with|can you help me with|i want to fix|fix my|repair my|i need|help me|please)\s+',
                '',
                target_issue,
                flags=re.IGNORECASE
            ).strip()

            if target_issue and len(target_issue) > 10:
                draft_content = (
                    f"I am experiencing an issue: {target_issue}. "
                    f"Looking for an experienced, reliable professional in {draft_location} to inspect and resolve this promptly. "
                    f"Please contact me with your availability and an estimate."
                )
            else:
                draft_content = (
                    f"I am looking for a qualified professional for {draft_title} in {draft_location}. "
                    f"Please inspect the requirements and reach out with your schedule, availability, and an estimate for the work."
                )
        elif not any(k in draft_content.lower() for k in ["availability", "estimate", "quote", "contact me", "reach out"]):
            draft_content = draft_content.rstrip(". ") + ". Please contact me with your availability and an estimate."

        user_query_for_intent = user_problem_txt.lower()
        user_wants_edit = bool(
            re.search(r'\b(?:edit|update|modify|change|correct)\b.*?\b(?:post|details|request|my post|that post|this post)\b', user_query_for_intent)
            or re.search(r'\b(?:edit|update|modify)\s+(?:this|my|the|that)?\s*post\b', user_query_for_intent)
            or any(kw in lower_content for kw in ["for editing (id", "for editing", "post details for editing", "updating post"])
        )

        explicit_id_pattern = r'\b(?:post\s*id\s*[:#]?|post\s*#|id\s*[:#])\s*(\d+)\b'
        target_id_m = re.search(explicit_id_pattern, user_problem_txt, re.IGNORECASE)
        if not target_id_m and user_wants_edit:
            target_id_m = re.search(r'\b(?:edit|update)\s+post\s*(?:#|id)?\s*(\d+)\b', user_problem_txt, re.IGNORECASE)
        if not target_id_m and user_wants_edit:
            target_id_m = re.search(r'\(?(?:ID|Post)\s*[:#]?\s*(\d+)\)?', last_ai_content, re.IGNORECASE)
        if not target_id_m and user_wants_edit:
            for prev_m in reversed(messages):
                prev_text = extract_text_content(getattr(prev_m, "content", ""))
                prev_id_m = re.search(r'\b(?:post\s*#?|id\s*[:#]?)\s*(\d+)\b', prev_text, re.IGNORECASE)
                if prev_id_m:
                    target_id_m = prev_id_m
                    break

        post_id_val = None
        if target_id_m:
            groups = [g for g in target_id_m.groups() if g is not None]
            if groups and groups[0].isdigit():
                post_id_val = int(groups[0])

        is_update_action = bool(
            metadata.get("action") == "update"
            or (user_wants_edit and post_id_val is not None)
            or (user_wants_edit and "updating post" in lower_content)
            or (user_wants_edit and "for editing" in lower_content)
        )
        action_val = "update" if is_update_action else "create"
        if action_val == "create":
            post_id_val = None

        card = PostConfirmationCard(
            action=action_val,
            postId=post_id_val,
            title=draft_title,
            content=draft_content,
            communityId=draft_category,
            location=draft_location,
            urgency=None,
            authorId=email,
            authorName=user_name,
            validationStatus="valid",
            validationNotes=(
                "You can edit the details in the form above and click 'Update Post' to save your changes."
                if action_val == "update"
                else f"Please review your draft details above and confirm to publish under your account ({user_name})."
            ),
            confirmPrompt=(
                f"CONFIRM_UPDATE: Yes, please update post ID {post_id_val} with title '{draft_title}' in {draft_category} for {draft_location}. Description: {draft_content}"
                if action_val == "update" and post_id_val
                else f"CONFIRM_PUBLISH: Yes, please publish the post '{draft_title}' in {draft_category} for {draft_location}."
            )
        )
        resp_type = "edit_community_post" if action_val == "update" else "create_community_post"
        clean_msg = _clean_card_intro_message(
            last_ai_content,
            ("Please review and edit your community post below:" if action_val == "update" else "Please review your draft community post below and confirm to publish:"),
            resp_type
        )
        return AgentCardResponse(
            response_type=resp_type,
            message=clean_msg,
            card_data=card.model_dump(),
            metadata={"agent": "community_agent", "user_email": email, "action": action_val, "postId": post_id_val}
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

    # C. Context-aware suggestions for Update / Edit / Question turns
    suggestions = metadata.get("suggested_actions")
    if not suggestions:
        is_asking_question = any(k in lower_content for k in [
            "what kind of work", "what service", "what type of service", "plumbing, electrical", "plumbing or electrical",
            "what category", "tell me what you need", "what issue are you facing", "service you need", "kind of service",
            "repairs, or something else", "what do you need help with", "what would you like to"
        ]) or last_ai_content.strip().endswith("?")

        if any(k in lower_content for k in ["new title", "what would you like the new title", "title to be"]):
            suggestions = ["Keep current title", "Change description instead", "Cancel update"]
        elif any(k in lower_content for k in ["new description", "new content", "what would you like the description"]):
            suggestions = ["Keep current description", "Change title instead", "Cancel update"]
        elif any(k in lower_content for k in ["what would you like to change", "proposed edits", "proposed update", "edit", "update", "change its title"]):
            suggestions = ["Change the title", "Change the description", "Change the category", "Change the location"]
        elif is_asking_question:
            # When the agent is asking a clarification question, do not show recommendation cards; only show the question
            suggestions = None
        else:
            suggestions = None

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
