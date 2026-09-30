"""
Community Specialist Agent Node for Workio Multi-Agent System.
Equipped with MCP community tools and user profile tools.
"""

import logging
import json
import re
from typing import Dict, Any, Optional, List
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.community_tools import COMMUNITY_TOOLS
from agent_backend.prompts.community_prompts import COMMUNITY_AGENT_SYSTEM_PROMPT
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
    CommunityPostSummary
)
from agent_backend.utils.sanitizer import (
    sanitize_messages_for_llm,
    extract_text_content,
    clean_card_intro_message,
    normalize_skills,
    format_specialist_structured_message
)

logger = logging.getLogger("agent_backend.community_agent")


async def community_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Community Agent processes user queries using MCP community and user tools.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@workio.lk")
    user_type = state.get("user_type", "Resident")
    metadata = state.get("metadata") or {}
    user_profile = state.get("user_profile") or {}
    user_name = metadata.get("user_name") or user_profile.get("displayName") or (email.split("@")[0] if "@" in email else "Resident")
    user_location = metadata.get("location") or user_profile.get("address") or "Colombo"

    system_instruction = COMMUNITY_AGENT_SYSTEM_PROMPT.format(
        email=email,
        user_type=user_type,
        user_name=user_name,
        user_location=user_location
    )

    clean_messages = sanitize_messages_for_llm(messages)
    prompt_messages = [SystemMessage(content=system_instruction)] + clean_messages

    # If OpenAI API Key is valid, use gpt-4o-mini with tool bindings
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            logger.info(f"📢 [Community Agent] Executing LLM with tools for user '{email}' ({user_type})")
            llm = ChatOpenAI(
                model=settings.openai_model,
                api_key=settings.openai_api_key
            )
            llm_with_tools = llm.bind_tools(COMMUNITY_TOOLS)
            response = await llm_with_tools.ainvoke(prompt_messages)
            result: Dict[str, Any] = {"messages": [response]}
            if not getattr(response, "tool_calls", None):
                # Final agent turn: enforce Pydantic Structured Output on conversational message
                response = await format_specialist_structured_message(prompt_messages, response, llm=llm)
                sim_state = dict(state)
                sim_state["messages"] = messages + [response]
                result["messages"] = [response]
                result["structured_response"] = build_community_card(sim_state, ai_message=response)
            return result
        except Exception as e:
            error_msg = f"Error in Community Agent: {str(e)}"
            err_ai = AIMessage(content=error_msg)
            sim_state = dict(state)
            sim_state["messages"] = messages + [err_ai]
            return {
                "messages": [err_ai],
                "structured_response": build_community_card(sim_state, ai_message=err_ai)
            }

    # Offline / Test fallback when API key is not yet set
    last_text = messages[-1].content if messages else ""
    offline_msg = AIMessage(
        content=f"[Offline Mode] Received request for community posts: '{last_text}'. "
                f"Active user: {email} ({user_type}). "
                f"Please configure OPENAI_API_KEY to enable live MCP tool execution."
    )
    sim_state = dict(state)
    sim_state["messages"] = messages + [offline_msg]
    return {
        "messages": [offline_msg],
        "structured_response": build_community_card(sim_state, ai_message=offline_msg)
    }


def build_community_card(state: AgentState, ai_message: Optional[Any] = None) -> AgentCardResponse:
    """Direct Tool-to-UI Card Mapper for Community Agent."""
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

    # Locate ToolMessage executed in the CURRENT conversation turn
    latest_tool: Optional[ToolMessage] = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) or getattr(msg, "type", "") == "tool":
            latest_tool = msg
            break
        elif isinstance(msg, HumanMessage) or getattr(msg, "type", "") in ("human", "user"):
            break

    # 1. TOOL-DRIVEN CARDS
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
                metadata={"agent": "community_agent", "user_email": email}
            )

        # create_community_post
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

        # get_community_posts / get_user_community_posts
        if tool_name in ["get_community_posts", "get_user_community_posts"]:
            is_single_post = isinstance(data, dict) and bool(data.get("id") or data.get("postId")) and not ("posts" in data or "items" in data)
            if is_single_post:
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
                clean_msg = clean_card_intro_message(
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
            clean_msg = clean_card_intro_message(
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

        # update_community_post
        if tool_name == "update_community_post":
            card = PostUpdatedCard(
                id=data.get("id") or data.get("postId") or "",
                title=data.get("title", "Updated Post"),
                content=data.get("content", ""),
                communityId=data.get("serviceCategoryId") or data.get("communityId"),
                location=data.get("location")
            )
            clean_msg = clean_card_intro_message(
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

        # delete_community_post
        if tool_name == "delete_community_post":
            card = PostDeletedCard(
                id=data.get("id") or data.get("postId") or "",
                status=data.get("status", "Removed"),
                message=data.get("message", "Post successfully removed from community board.")
            )
            clean_msg = clean_card_intro_message(
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

        # get_user_details / get_worker_details
        if tool_name in ["get_user_details", "get_worker_details"]:
            card = UserProfileCard(
                email=data.get("email") or email,
                role=data.get("role") or user_type,
                isWorker=data.get("isWorker", False),
                displayName=data.get("displayName") or data.get("name") or user_name,
                phoneNo=data.get("phoneNo") or data.get("phoneNumber"),
                address=data.get("address") or data.get("primaryServiceArea") or "Colombo",
                workerRating=data.get("workerRating") or data.get("overallRating") or data.get("rating"),
                completedJobs=data.get("completedJobs"),
                skills=normalize_skills(data.get("skills")),
                pricingModel=data.get("pricingModel")
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
                metadata={"agent": "community_agent", "user_email": email}
            )

        # get_service_categories
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
                clean_msg = clean_card_intro_message(
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

    # 2. CONVERSATIONAL / DRAFTING TURNS
    lower_content = last_ai_content.lower()

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

        for trail in [
            "please review your post", "would you like to publish", "would you like me to publish",
            "reply 'confirm'", "you can edit any details"
        ]:
            if trail in draft_content.lower():
                idx = draft_content.lower().find(trail)
                draft_content = draft_content[:idx].strip().rstrip(". ")

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
        clean_msg = clean_card_intro_message(
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

    # Choice Turn
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

    # Edit / Update suggestions
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
    return AgentCardResponse(
        response_type="text_message",
        message=card.text,
        card_data=card.model_dump(),
        metadata={"agent": "community_agent", "user_email": email}
    )

