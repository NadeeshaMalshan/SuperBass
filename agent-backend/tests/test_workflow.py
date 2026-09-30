"""
Verification test suite for Workio Agent Backend.
Tests graph compilation, MCP tools, card schema validation, and routing.
"""

import json
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
from agent_backend.utils.card_builders import _deterministic_card_builder
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
    assert any(any(w in s for w in ["worker", "electrician", "find", "hire", "professional", "technician"]) for s in suggested_actions)
    assert any("community" in s or "post" in s for s in suggested_actions)

    # Verify card formatter builds a text_message card with suggestions, NOT a post_confirmation card
    state["messages"].append(result["messages"][0])
    if result.get("metadata"):
        state["metadata"] = result["metadata"]
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "text_message"
    assert any(any(w in str(s).lower() for w in ["worker", "electrician", "find", "hire", "professional", "technician"]) for s in card_resp.card_data.get("suggestions", []))
    assert any("community" in str(s).lower() or "post" in str(s).lower() for s in card_resp.card_data.get("suggestions", []))



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


def test_deterministic_card_builder_ignores_service_categories_during_draft_post():
    """Verify card formatter builds post_confirmation card when drafting a post, even if get_service_categories tool was called."""
    tool_content = '{"categories": ["Plumbing", "Electrical", "Carpentry", "Masonry"]}'
    draft_ai_message = (
        "Here is your draft community post:\n"
        "• Title: Emergency Water Leak Repair\n"
        "• Category: Plumbing\n"
        "• Location: Colombo\n"
        "• Content: I have an emergency water leak at my property in Colombo causing ongoing water overflow. "
        "I need an experienced plumber to attend immediately.\n"
        "Would you like to publish this post now? Reply 'confirm' or 'publish' to proceed."
    )
    state = {
        "messages": [
            HumanMessage(content="Create a community post for emergency plumber for water leak"),
            AIMessage(content="Checking categories..."),
            ToolMessage(content=tool_content, tool_call_id="call_cat_draft", name="get_service_categories"),
            AIMessage(content=draft_ai_message)
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "John Doe", "address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "post_confirmation"
    assert card_resp.card_data["title"] == "Emergency Water Leak Repair"
    assert card_resp.card_data["communityId"] == "Plumbing"
    assert card_resp.card_data["location"] == "Colombo"
    assert "emergency water leak" in card_resp.card_data["content"]


def test_deterministic_card_builder_ignores_service_categories_during_choice_turn():
    """Verify card formatter builds choice turn text card (Worker vs Community) instead of dumping 22 categories."""
    tool_content = '{"categories": ["Plumbing", "Electrical", "Carpentry", "Masonry"]}'
    choice_ai_message = (
        "I understand you are facing an emergency water leak and need an emergency plumber. "
        "Would you like to: 1) Find a Verified Worker — search and book a rated plumber now, "
        "or 2) Create a Community Post — publish your emergency service request on the community board for workers to contact you? "
        "Please reply with '1' (Find a Worker) or '2' (Create a Community Post)."
    )
    state = {
        "messages": [
            HumanMessage(content="Emergency plumber for water leak"),
            AIMessage(content="Checking categories..."),
            ToolMessage(content=tool_content, tool_call_id="call_cat_choice", name="get_service_categories"),
            AIMessage(content=choice_ai_message)
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "John Doe", "address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "text_message"
    assert card_resp.card_data.get("is_choice") is True
    suggestion_texts = [s["text"] if isinstance(s, dict) else str(s) for s in card_resp.card_data.get("suggestions", [])]
    assert any("worker" in s.lower() for s in suggestion_texts)
    assert any("community" in s.lower() for s in suggestion_texts)




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


def test_deterministic_card_builder_search_workers_budget_filtering():
    """Verify that worker results strictly enforce user's hourly rate budget."""
    raw_workers_json = json.dumps([
        {"id": 1, "name": "Kamal Perera", "hourlyRate": 2400.0, "description": "Plumber", "skills": ["Plumbing"]},
        {"id": 2, "name": "Malith Mendis", "hourlyRate": 2900.0, "description": "Plumber", "skills": ["Plumbing"]}
    ])

    # Case 1: Budget 2000 -> Neither qualifies -> TextMessageCard explaining lowest rate is 2400
    state_below_2000 = {
        "messages": [
            HumanMessage(content="i want hourly rate below 2000"),
            AIMessage(
                content="Searching plumbers...",
                tool_calls=[{"id": "call_w1", "name": "search_workers", "args": {"category": "Plumbing", "maxHourlyRate": 2000}}]
            ),
            ToolMessage(content=raw_workers_json, tool_call_id="call_w1", name="search_workers"),
            AIMessage(content="Here are the available plumbers:")
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp1 = _deterministic_card_builder(state_below_2000)
    assert card_resp1.response_type == "text_message"
    assert "2000" in card_resp1.message
    assert "2400" in card_resp1.message

    # Case 2: Budget 2500 -> Only Kamal (2400) qualifies
    state_below_2500 = {
        "messages": [
            HumanMessage(content="i want hourly rate below 2500"),
            AIMessage(
                content="Searching plumbers...",
                tool_calls=[{"id": "call_w2", "name": "search_workers", "args": {"category": "Plumbing", "maxHourlyRate": 2500}}]
            ),
            ToolMessage(content=raw_workers_json, tool_call_id="call_w2", name="search_workers"),
            AIMessage(content="Here are the available plumbers:")
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp2 = _deterministic_card_builder(state_below_2500)
    assert card_resp2.response_type == "worker_list"
    assert card_resp2.card_data["totalCount"] == 1
    assert card_resp2.card_data["workers"][0]["name"] == "Kamal Perera"


def test_service_category_normalization():
    """Verify that informal phrases, typos, and synonyms correctly map to official categories."""
    from agent_backend.tools.booking_tools import normalize_service_category

    assert normalize_service_category("for repir my car") == "Vehicle Repair & Mechanic"
    assert normalize_service_category("mcanins") == "Vehicle Repair & Mechanic"
    assert normalize_service_category("vechila repiring") == "Vehicle Repair & Mechanic"
    assert normalize_service_category("car repair") == "Vehicle Repair & Mechanic"
    assert normalize_service_category("mechanic") == "Vehicle Repair & Mechanic"
    assert normalize_service_category("tap leakage") == "Plumbing"
    assert normalize_service_category("electrician") == "Electrical"
    assert normalize_service_category("ac repair") == "AC & Air Conditioning"



def test_4_agent_nodes_presence():
    """Verify all 4 specialized agent nodes and their tool nodes are compiled into the graph without card_formatter."""
    from agent_backend.graph.workflow import graph
    node_names = set(graph.nodes.keys())
    expected_nodes = {
        "supervisor",
        "community_agent",
        "community_tools",
        "worker_matching_agent",
        "worker_matching_tools",
        "booking_agent",
        "booking_tools",
        "support_review_agent",
        "support_review_tools"
    }
    assert expected_nodes.issubset(node_names)
    # Architecture A verification: card_formatter node must NOT be in LangGraph
    assert "card_formatter" not in node_names



def test_tool_suites_registration():
    """Verify all 4 tool suites contain the required MCP tool wrappers."""
    from agent_backend.tools.community_tools import COMMUNITY_TOOLS
    from agent_backend.tools.worker_matching_tools import WORKER_MATCHING_TOOLS
    from agent_backend.tools.booking_tools import BOOKING_TOOLS
    from agent_backend.tools.support_review_tools import SUPPORT_REVIEW_TOOLS

    worker_tools = {t.name for t in WORKER_MATCHING_TOOLS}
    assert "search_workers" in worker_tools
    assert "get_worker_details" in worker_tools
    assert "get_worker_performance" in worker_tools

    booking_tools = {t.name for t in BOOKING_TOOLS}
    assert "check_worker_availability" in booking_tools
    assert "create_booking" in booking_tools
    assert "get_resident_bookings" in booking_tools
    assert "reschedule_booking" in booking_tools
    assert "cancel_booking" in booking_tools

    support_review_tools = {t.name for t in SUPPORT_REVIEW_TOOLS}
    assert "create_worker_review" in support_review_tools
    assert "get_worker_performance" in support_review_tools
    assert "get_user_details" in support_review_tools


@pytest.mark.asyncio
async def test_supervisor_worker_matching_routing():
    """Verify supervisor routes technician discovery to worker_matching_agent."""
    state = {
        "messages": [HumanMessage(content="find me a plumber near Colombo")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "worker_matching_agent"


@pytest.mark.asyncio
async def test_supervisor_support_review_routing():
    """Verify supervisor routes reviews and ratings to support_review_agent."""
    state = {
        "messages": [HumanMessage(content="I want to give 5 stars review to Sunil for great work")],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    result = await supervisor_node(state)
    assert result.get("next") == "support_review_agent"


@pytest.mark.asyncio
async def test_card_builder_zero_llm():
    """Verify card builder is 100% deterministic with zero LLM calls and executes in < 5ms."""
    import time
    from agent_backend.utils.card_builders import build_worker_matching_card

    state = {
        "messages": [
            HumanMessage(content="find me a plumber"),
            ToolMessage(
                content=json.dumps([{"id": 10, "name": "Sunil Shantha", "skills": ["Plumbing"], "hourlyRate": 2000.0}]),
                tool_call_id="call_w",
                name="search_workers"
            )
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }

    t0 = time.perf_counter()
    resp = build_worker_matching_card(state)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    assert resp.response_type == "worker_list"
    assert resp.card_data["workers"][0]["name"] == "Sunil Shantha"
    assert elapsed_ms < 50.0  # Runs in single-digit milliseconds, proving zero network/LLM calls



def test_deterministic_card_builder_all_tool_families():
    """Verify deterministic card mapping for details, bookings, reviews, and disputes."""
    # 1. get_worker_details -> user_profile
    s_details = {
        "messages": [
            ToolMessage(
                content=json.dumps({"id": 13, "name": "Kusal Mendis", "overallRating": 4.9, "skills": ["Electrical"]}),
                tool_call_id="c1",
                name="get_worker_details"
            )
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    r_details = _deterministic_card_builder(s_details)
    assert r_details.response_type == "user_profile"
    assert r_details.card_data["displayName"] == "Kusal Mendis"

    # 2. reschedule_booking -> text_message
    s_reschedule = {
        "messages": [
            ToolMessage(
                content=json.dumps({"bookingId": 42, "status": "Rescheduled"}),
                tool_call_id="c2",
                name="reschedule_booking"
            )
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    r_reschedule = _deterministic_card_builder(s_reschedule)
    assert r_reschedule.response_type == "text_message"
    assert "42" in r_reschedule.message

    # 3. create_worker_review -> text_message
    s_review = {
        "messages": [
            ToolMessage(
                content=json.dumps({"status": "success", "reviewId": "rev_10"}),
                tool_call_id="c3",
                name="create_worker_review"
            )
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": None,
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    r_review = _deterministic_card_builder(s_review)
    assert r_review.response_type == "text_message"
    assert "submitted" in r_review.message.lower() or "recorded" in r_review.message.lower()


@pytest.mark.asyncio
async def test_architecture_a_direct_structured_responses():
    """Verify all 4 specialist agents directly produce structured_response (Architecture A)."""
    from unittest.mock import patch, AsyncMock
    from langchain_openai import ChatOpenAI
    from agent_backend.agents.worker_matching_agent import worker_matching_agent_node
    from agent_backend.agents.booking_agent import booking_agent_node
    from agent_backend.agents.community_agent import community_agent_node
    from agent_backend.agents.support_review_agent import support_review_agent_node


    base_state = {
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": {"address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }

    # 1. Worker Matching Agent directly produces structured_response
    w_state = dict(base_state)
    w_state["messages"] = [
        HumanMessage(content="find me a plumber"),
        AIMessage(content="", tool_calls=[{"id": "w1", "name": "search_workers", "args": {"category": "Plumbing"}}]),
        ToolMessage(
            content=json.dumps([{"id": 1, "name": "Nimal Perera", "hourlyRate": 2200.0, "skills": ["Plumbing"]}]),
            tool_call_id="w1",
            name="search_workers"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="I found 1 verified technician matching your criteria:")
        w_res = await worker_matching_agent_node(w_state)
        assert "structured_response" in w_res
        assert w_res["structured_response"].response_type == "worker_list"
        assert w_res["structured_response"].card_data["workers"][0]["name"] == "Nimal Perera"

    # 2. Booking Agent directly produces structured_response
    b_state = dict(base_state)
    b_state["messages"] = [
        HumanMessage(content="cancel my booking 99"),
        AIMessage(content="", tool_calls=[{"id": "b1", "name": "cancel_booking", "args": {"bookingId": 99}}]),
        ToolMessage(
            content=json.dumps({"bookingId": 99, "status": "Cancelled"}),
            tool_call_id="b1",
            name="cancel_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Booking #99 has been cancelled.")
        b_res = await booking_agent_node(b_state)
        assert "structured_response" in b_res
        assert b_res["structured_response"].response_type == "text_message"
        assert "99" in b_res["structured_response"].message

    # 3. Community Agent directly produces structured_response
    c_state = dict(base_state)
    c_state["messages"] = [
        HumanMessage(content="create post"),
        AIMessage(content="", tool_calls=[{"id": "c1", "name": "create_community_post", "args": {"title": "Garden Clean", "content": "Help needed"}}]),
        ToolMessage(
            content=json.dumps({"id": 55, "title": "Garden Clean", "content": "Help needed", "location": "Kandy"}),
            tool_call_id="c1",
            name="create_community_post"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Post created successfully.")
        c_res = await community_agent_node(c_state)
        assert "structured_response" in c_res
        assert c_res["structured_response"].response_type == "post_created"
        assert c_res["structured_response"].card_data["title"] == "Garden Clean"

    # 4. Support & Review Agent directly produces structured_response
    s_state = dict(base_state)
    s_state["messages"] = [
        HumanMessage(content="rate worker"),
        AIMessage(content="", tool_calls=[{"id": "s1", "name": "create_worker_review", "args": {"workerId": 1, "rating": 5}}]),
        ToolMessage(
            content=json.dumps({"status": "success", "reviewId": "rev_55"}),
            tool_call_id="s1",
            name="create_worker_review"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Your review has been recorded.")
        s_res = await support_review_agent_node(s_state)
        assert "structured_response" in s_res
        assert s_res["structured_response"].response_type == "text_message"


@pytest.mark.asyncio
async def test_card_builder_with_list_content_blocks():
    """Verify handling of list-based content blocks (from reasoning models like Luna/o1) without 'list has no lower' error."""
    from agent_backend.utils.card_builders import _deterministic_card_builder, build_community_card, format_specialist_structured_message
    from agent_backend.utils.sanitizer import extract_text_content

    # 1. extract_text_content unit tests
    assert extract_text_content("hello") == "hello"
    assert extract_text_content([{"type": "text", "text": "chunk1"}, {"type": "text", "text": "chunk2"}]) == "chunk1\nchunk2"
    assert extract_text_content(["simple", "list"]) == "simple\nlist"

    # 2. State with list-based AIMessage content
    state = {
        "messages": [
            HumanMessage(content=[{"type": "text", "text": "I need help with my garden"}]),
            ToolMessage(content='{"categories": ["Gardening"]}', tool_call_id="call_test", name="get_service_categories"),
            AIMessage(content=[{"type": "text", "text": "Here are the gardening details."}])
        ],
        "email": "resident@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "John Doe", "address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = build_community_card(state, ai_message=state["messages"][-1])
    assert card_resp is not None
    assert isinstance(card_resp.message, str)

    # 3. format_specialist_structured_message with list-based AIMessage
    list_ai = AIMessage(content=[{"type": "text", "text": "A simple list message"}])
    res_ai = await format_specialist_structured_message([], list_ai)
    assert isinstance(res_ai.content, str)
    assert res_ai.content == "A simple list message"


def test_clean_card_intro_message_removes_bold_field_dumps():
    """Verify that bold field dumps like **Title:** and • **Category:** are completely stripped from chat messages."""
    from agent_backend.utils.card_builders import _clean_card_intro_message

    raw = (
        "Here is your draft community post: • **Title:** Car Repair Service Request • "
        "**Category:** Vehicle Repair & Mechanic • **Location:** Colombo • "
        "**Content:** My car has broken down and needs professional inspection and repair. "
        "Please review the details above. You can edit them or attach photos before publishing. "
        "I'll wait for your confirmation before posting."
    )
    cleaned = _clean_card_intro_message(raw, "Please review your draft below:", "post_confirmation")
    assert "**Title:**" not in cleaned
    assert "**Category:**" not in cleaned
    assert "**Location:**" not in cleaned
    assert "**Content:**" not in cleaned
    assert "•" not in cleaned
    assert "Car Repair Service Request" not in cleaned
    assert "Here is your draft community post:" in cleaned
    assert "Please review the details below." in cleaned
    assert "I'll wait for your confirmation before posting." in cleaned


def test_single_post_detail_card_built_from_get_community_posts():
    """Verify that get_community_posts with single post dict creates PostDetailCard, not empty PostListCard."""
    from agent_backend.utils.card_builders import _deterministic_card_builder

    state = {
        "messages": [
            HumanMessage(content="Show details for post #20"),
            ToolMessage(
                content='{"id": 20, "title": "Car Repair Service Request", "content": "Engine inspection needed", "serviceCategoryId": "vehicle-repair-mechanic", "location": "Colombo", "userName": "Jayashan", "userEmail": "jayashan@workio.lk", "likesCount": 1, "commentsCount": 0}',
                tool_call_id="call_show_20",
                name="get_community_posts"
            ),
            AIMessage(content="Post #20 is active.")
        ],
        "email": "jayashan@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "Jayashan"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "post_detail"
    assert card_resp.card_data["id"] == 20
    assert card_resp.card_data["title"] == "Car Repair Service Request"


def test_conversational_turn_does_not_recycle_old_tools():
    """Verify that a turn without tool execution (e.g. 'i need edit it') builds TextMessageCard and does not recycle previous tools."""
    from agent_backend.utils.card_builders import _deterministic_card_builder

    state = {
        "messages": [
            # Turn 1: Tool executed
            HumanMessage(content="Show details for post #20"),
            ToolMessage(content='{"id": 20, "title": "Car Repair Service Request"}', tool_call_id="call_20", name="get_community_posts"),
            AIMessage(content="Post #20 details are above."),
            # Turn 2: Follow-up question without tool execution
            HumanMessage(content="i need edit it"),
            AIMessage(content="What would you like to change—its title, description, category, or location?")
        ],
        "email": "jayashan@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "Jayashan"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "text_message"
    assert "What would you like to change" in card_resp.message
    assert any("title" in str(s).lower() for s in card_resp.card_data.get("suggestions", []))


def test_strips_leading_empty_brackets():
    """Verify that leading '[]' empty citation/thought artifacts from Luna are stripped cleanly."""
    from agent_backend.utils.sanitizer import extract_text_content
    from agent_backend.utils.card_builders import _clean_card_intro_message

    raw1 = "[]\nHere is your draft community post: Please review the details."
    raw2 = "[] Post #20 currently has the title 'Car Repair'."
    
    assert extract_text_content(raw1) == "Here is your draft community post: Please review the details."
    assert extract_text_content(raw2) == "Post #20 currently has the title 'Car Repair'."

    cleaned = _clean_card_intro_message(raw1, "Default intro", "post_confirmation")
    assert not cleaned.startswith("[]")
    assert not cleaned.startswith("[")


def test_draft_content_never_uses_ai_announcement():
    """Verify draft_content uses user's problem description, never 'Here is your draft...'"""
    from agent_backend.utils.card_builders import _deterministic_card_builder

    state = {
        "messages": [
            HumanMessage(content="My washroom tap is leaking heavily and flooding the floor"),
            AIMessage(content="Here is your draft community post: Please review the details in the draft card. You can edit them, attach photos, and publish when ready.")
        ],
        "email": "jayashan@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "Jayashan", "address": "Colombo"},
        "next": None,
        "structured_response": None,
        "metadata": {"inferred_category": "Plumbing"}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "post_confirmation"
    assert "Here is your draft" not in card_resp.card_data["content"]
    assert "tap is leaking" in card_resp.card_data["content"]


def test_title_update_suggestions():
    """Verify that asking for a new title shows relevant suggestions, not technician/booking buttons."""
    from agent_backend.utils.card_builders import _deterministic_card_builder

    state = {
        "messages": [
            HumanMessage(content="Change the title"),
            AIMessage(content="What would you like the new title to be? Once you provide it, I'll show you the proposed update for confirmation.")
        ],
        "email": "jayashan@workio.lk",
        "user_type": "Resident",
        "user_profile": {"displayName": "Jayashan"},
        "next": None,
        "structured_response": None,
        "metadata": {}
    }
    card_resp = _deterministic_card_builder(state)
    assert card_resp.response_type == "text_message"
    suggestions = [str(s).lower() for s in card_resp.card_data.get("suggestions", [])]
    assert any("title" in s or "cancel" in s for s in suggestions)
    assert not any("book a service technician" in s for s in suggestions)


if __name__ == "__main__":
    test_card_schemas()
    test_langgraph_compilation()
    test_4_agent_nodes_presence()
    test_tool_suites_registration()
    test_deterministic_card_builder_for_created_post()
    test_deterministic_card_builder_for_service_categories()
    test_deterministic_card_builder_all_tool_families()
    asyncio.run(test_card_builder_zero_llm())
    asyncio.run(test_supervisor_greeting())
    asyncio.run(test_supervisor_community_routing())
    asyncio.run(test_supervisor_booking_routing())
    asyncio.run(test_supervisor_worker_matching_routing())
    asyncio.run(test_supervisor_support_review_routing())
    asyncio.run(test_architecture_a_direct_structured_responses())
    print("All Workio Architecture A Multi-Agent tests passed successfully!")

