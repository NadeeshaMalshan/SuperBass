"""
Verification test suite for SuperBass Agent Backend.
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
    ErrorCard
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
        authorId="resident@superbass.lk"
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


def test_langgraph_compilation():
    """Verify that the LangGraph StateGraph compiles cleanly without errors."""
    compiled_graph = build_graph().compile()
    assert compiled_graph is not None


@pytest.mark.asyncio
async def test_supervisor_greeting():
    """Verify supervisor routes greetings to FINISH with a helpful message."""
    state = {
        "messages": [HumanMessage(content="Hello!")],
        "email": "resident@superbass.lk",
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
        "email": "resident@superbass.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "community_agent"


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


def test_community_tools_count():
    """Verify exactly 6 community MCP tools are registered."""
    assert len(COMMUNITY_TOOLS) == 6
    names = [t.name for t in COMMUNITY_TOOLS]
    expected = [
        "create_community_post",
        "get_community_posts",
        "update_community_post",
        "delete_community_post",
        "get_user_community_posts",
        "get_user_details"
    ]
    for exp in expected:
        assert exp in names


if __name__ == "__main__":
    test_card_schemas()
    test_langgraph_compilation()
    test_community_tools_count()
    test_deterministic_card_builder_for_created_post()
    asyncio.run(test_supervisor_greeting())
    asyncio.run(test_supervisor_community_routing())
    print("All SuperBass Agent Backend tests passed successfully!")
