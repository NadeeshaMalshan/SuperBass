"""
Verification test suite for Workio Agent Backend.
Tests graph compilation, MCP tools, card schema validation, and routing.
"""

import pytest
import asyncio
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from agent_backend.graph.workflow import graph, build_graph
from agent_backend.schemas.card_models import (
    AgentCardResponse,
    PostCreatedCard,
    PostListCard,
    PostDetailCard,
    PostUpdatedCard,
    PostDeletedCard,
    UserProfileCard,
    TextMessageCard,
    ErrorCard,
    ServiceCategoriesCard
)
from agent_backend.agents.card_formatter import _deterministic_card_builder
from agent_backend.agents.supervisor import supervisor_node
from agent_backend.tools.community_tools import COMMUNITY_TOOLS


def test_card_schemas():
    """Verify that all UI Card schemas instantiate and serialize properly."""
    # 1. PostCreatedCard
    c1 = PostCreatedCard(
        id=101,
        title="Need Plumbing Repair",
        content="Kitchen sink leaking",
        communityId="Plumbing",
        location="Colombo",
        authorId="resident@workio.lk"
    )
    assert c1.title == "Need Plumbing Repair"
    assert c1.status == "Active"

    # 2. PostListCard
    c2 = PostListCard(category="General", totalCount=1, posts=[])
    assert c2.category == "General"

    # 3. PostDetailCard
    c3 = PostDetailCard(
        id=101,
        title="AC Maintenance",
        content="Full service needed",
        communityId="AC",
        likesCount=3,
        commentsCount=1
    )
    assert c3.likesCount == 3

    # 4. PostUpdatedCard
    c4 = PostUpdatedCard(id=101, title="Updated Title", content="Updated body")
    assert c4.title == "Updated Title"

    # 5. PostDeletedCard
    c5 = PostDeletedCard(id=101)
    assert c5.status == "Removed"

    # 6. UserProfileCard
    c6 = UserProfileCard(
        email="kpjmp28@gmail.com",
        role="Resident",
        displayName="Kapila Perera"
    )
    assert c6.role == "Resident"

    # 7. TextMessageCard
    c7 = TextMessageCard(text="Hello", suggestions=["Post query", "View feed"])
    assert len(c7.suggestions) == 2

    # 8. ErrorCard
    c8 = ErrorCard(errorCode="NOT_FOUND", message="Post not found")
    assert c8.errorCode == "NOT_FOUND"

    # 9. ServiceCategoriesCard
    c9 = ServiceCategoriesCard(
        categories=["Plumbing", "Electrical", "Carpentry"],
        totalCount=3,
        suggestedNextAction="Pick a category"
    )
    assert len(c9.categories) == 3
    assert c9.totalCount == 3


def test_langgraph_compilation():
    """Verify that the LangGraph StateGraph compiles cleanly without errors."""
    compiled_graph = build_graph().compile()
    assert compiled_graph is not None


@pytest.mark.asyncio
async def test_supervisor_greeting():
    """Verify supervisor routes greetings to FINISH with a helpful message."""
    state = {
        "messages": [HumanMessage(content="Hello!")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "FINISH"
    assert len(result.get("messages", [])) > 0


@pytest.mark.asyncio
async def test_supervisor_community_routing():
    """Verify supervisor routes post creation or feed requests to community_agent."""
    state = {
        "messages": [HumanMessage(content="I want to create a new community post about plumbing")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "community_agent"


@pytest.mark.asyncio
async def test_supervisor_booking_routing():
    """Verify supervisor routes booking and appointment intents to booking_agent."""
    state = {
        "messages": [HumanMessage(content="I want to book an electrician for tomorrow")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "booking_agent"


@pytest.mark.asyncio
async def test_supervisor_issue_description_clarification():
    """Verify that when a user simply describes a problem, supervisor asks whether to find worker or post on community."""
    state = {
        "messages": [HumanMessage(content="my room electrict wiring is not good it is messy")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": {"address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    # When using heuristic fallback or structured router, intent is clarified
    assert result.get("next") == "FINISH"
    asst_msg = result.get("messages", [])[0].content.lower()
    assert "how would you like to proceed" in asst_msg or "proceed" in asst_msg or "worker" in asst_msg
    suggested_actions = [str(s).lower() for s in result.get("metadata", {}).get("suggested_actions", [])]
    assert any("worker" in s or "electrician" in s or "find" in s for s in suggested_actions)
    assert any("community post" in s or "post" in s for s in suggested_actions)

    # Verify card formatter builds a text_message card with suggestions, NOT a post_confirmation card
    state["messages"].append(result["messages"][0])
    if result.get("metadata"):
        state["metadata"] = result["metadata"]
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "text_message"
    assert any("worker" in str(s).lower() or "electrician" in str(s).lower() for s in card_resp.card_data.get("suggestions", []))
    assert any("community post" in str(s).lower() for s in card_resp.card_data.get("suggestions", []))


def test_deterministic_card_builder_for_created_post():
    """Verify card formatter correctly constructs a PostCreatedCard from tool output."""
    tool_content = '{"id": 42, "title": "Electrical socket issue", "content": "Living room socket spark", "serviceCategoryId": "Electrical", "userId": "kpjmp28@gmail.com", "location": "Kandy"}'
    state = {
        "messages": [
            HumanMessage(content="Create a post for electrical socket"),
            AIMessage(content="Creating post..."),
            ToolMessage(content=tool_content, tool_call_id="call_1", name="create_community_post"),
            AIMessage(content="Post created successfully.")
        ],
        "email": "kpjmp28@gmail.com",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "post_created"
    assert card_resp.card_data.get("id") == 42
    assert card_resp.card_data.get("title") == "Electrical socket issue"
    assert card_resp.card_data.get("location") == "Kandy"


def test_deterministic_card_builder_for_service_categories():
    """Verify card formatter correctly constructs a ServiceCategoriesCard from tool output."""
    tool_content = '{"categories": ["Plumbing", "Electrical", "Carpentry", "Masonry"]}'
    state = {
        "messages": [
            HumanMessage(content="Show service categories"),
            AIMessage(content="Fetching categories..."),
            ToolMessage(content=tool_content, tool_call_id="call_cat_1", name="get_service_categories"),
            AIMessage(content="Here are the available categories.")
        ],
        "email": "kpjmp28@gmail.com",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "service_categories"
    assert "categories" in card_resp.card_data
    assert len(card_resp.card_data["categories"]) == 4


def test_community_tools_count():
    """Verify all 7 community MCP tools are registered."""
    assert len(COMMUNITY_TOOLS) == 7
    names = [t.name for t in COMMUNITY_TOOLS]
    expected = [
        "create_community_post",
        "get_community_posts",
        "update_community_post",
        "delete_community_post",
        "get_user_community_posts",
        "get_user_details",
        "get_service_categories"
    ]
    for exp in expected:
        assert exp in names


def test_sanitizer_and_post_image_contextvar():
    """Verify that huge base64 images are kept out of LLM messages and correctly passed via contextvar."""
    from agent_backend.utils.sanitizer import sanitize_messages_for_llm, sanitize_text
    from agent_backend.tools.community_tools import current_post_images

    # 1. Test massive base64 payload sanitization
    huge_base64 = "data:image/png;base64," + "A" * 100000
    user_prompt = f"Please post this image: {huge_base64}"
    clean_text = sanitize_text(user_prompt)
    assert "data:image" not in clean_text
    assert "[attached_image]" in clean_text

    # 2. Test AIMessage tool call args sanitization
    ai_msg = AIMessage(
        content="I will create the post",
        tool_calls=[{
            "id": "call_1",
            "name": "create_community_post",
            "args": {
                "authorId": "resident@workio.lk",
                "title": "Broken pipe",
                "content": "Water leaking",
                "images": [huge_base64, huge_base64]
            }
        }]
    )
    clean_msgs = sanitize_messages_for_llm([HumanMessage(content=clean_text), ai_msg])
    tool_args = clean_msgs[1].tool_calls[0]["args"]
    assert "data:image" not in tool_args["images"][0]
    assert "[attached_image_1]" in tool_args["images"][0]

    # 3. Test contextvar storage and retrieval
    current_post_images.set([huge_base64])
    assert current_post_images.get() == [huge_base64]



if __name__ == "__main__":
    test_card_schemas()
    test_langgraph_compilation()
    test_community_tools_count()
    test_deterministic_card_builder_for_created_post()
    test_deterministic_card_builder_for_service_categories()
    asyncio.run(test_supervisor_greeting())
    asyncio.run(test_supervisor_community_routing())
    asyncio.run(test_supervisor_booking_routing())
    print("All Workio Agent Backend tests passed successfully!")
