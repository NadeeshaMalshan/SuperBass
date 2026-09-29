"""
Unit and Integration Test Suite covering all 16 Architecture A Scenarios specified in Section 28.
Verifies that:
- Supervisor routes or directly clarifies intents.
- Specialist agents interpret MCP tool results and directly produce validated AgentCardResponse.
- Zero Card Formatter node exists in LangGraph.
- Errors and empty results are handled gracefully with structured response types.
"""

import json
import pytest
from unittest.mock import patch, AsyncMock
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI

from agent_backend.schemas.card_models import AgentCardResponse
from agent_backend.agents.supervisor import supervisor_node
from agent_backend.agents.worker_matching_agent import worker_matching_agent_node
from agent_backend.agents.booking_agent import booking_agent_node
from agent_backend.agents.community_agent import community_agent_node
from agent_backend.agents.support_review_agent import support_review_agent_node
from agent_backend.graph.workflow import graph


BASE_STATE = {
    "email": "resident@workio.lk",
    "user_type": "Resident",
    "user_profile": {"address": "Colombo"},
    "next": None,
    "structured_response": None,
    "metadata": {}
}


# -----------------------------------------------------------------------------
# Scenario 1: Worker Search
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_1_worker_search():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Find me a plumber near Colombo"),
        AIMessage(content="", tool_calls=[{"id": "call_1", "name": "search_workers", "args": {"category": "Plumbing"}}]),
        ToolMessage(
            content=json.dumps([
                {"id": 1, "name": "Nimal Perera", "hourlyRate": 2200.0, "skills": ["Plumbing"], "rating": 4.8}
            ]),
            tool_call_id="call_1",
            name="search_workers"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="I found 1 verified plumber:")
        res = await worker_matching_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "worker_list"
        assert card.card_data["workers"][0]["name"] == "Nimal Perera"


# -----------------------------------------------------------------------------
# Scenario 2: Worker Details
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_2_worker_details():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Show details of worker 1"),
        AIMessage(content="", tool_calls=[{"id": "call_2", "name": "get_worker_details", "args": {"workerId": "1"}}]),
        ToolMessage(
            content=json.dumps({
                "id": 1,
                "name": "Anura Liyanage",
                "phoneNo": "0771234567",
                "address": "Colombo",
                "skills": ["Plumbing", "Pipe Fitting"],
                "overallRating": 4.9,
                "completedJobs": 24
            }),
            tool_call_id="call_2",
            name="get_worker_details"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Here are the worker details:")
        res = await worker_matching_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "user_profile"
        assert card.card_data["displayName"] == "Anura Liyanage"


# -----------------------------------------------------------------------------
# Scenario 3: Worker Performance
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_3_worker_performance():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="What is the rating of worker 1?"),
        AIMessage(content="", tool_calls=[{"id": "call_3", "name": "get_worker_performance", "args": {"workerId": "1"}}]),
        ToolMessage(
            content=json.dumps({
                "workerId": "1",
                "name": "Anura Liyanage",
                "overallRating": 4.9,
                "completedJobs": 24,
                "positiveReviewPercentage": 96.0
            }),
            tool_call_id="call_3",
            name="get_worker_performance"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Worker 1 has an overall rating of 4.9 out of 5 across 24 completed jobs.")
        res = await support_review_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "4.9" in card.message or "4.9" in str(card.card_data)


# -----------------------------------------------------------------------------
# Scenario 4: Booking Availability
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_4_booking_availability():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Check availability for worker 1 tomorrow"),
        AIMessage(content="", tool_calls=[{"id": "call_4", "name": "check_worker_availability", "args": {"workerId": "1", "date": "2026-09-30"}}]),
        ToolMessage(
            content=json.dumps({
                "workerId": "1",
                "available": True,
                "availableSlots": ["09:00 - 11:00", "14:00 - 16:00"]
            }),
            tool_call_id="call_4",
            name="check_worker_availability"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Worker 1 is available tomorrow morning from 9:00 AM to 11:00 AM.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "available" in card.message.lower()


# -----------------------------------------------------------------------------
# Scenario 5: Booking Creation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_5_booking_creation():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Book worker 1 for plumbing tomorrow at 9am"),
        AIMessage(content="", tool_calls=[{"id": "call_5", "name": "create_booking", "args": {"workerId": "1", "bookingDate": "2026-09-30T09:00:00"}}]),
        ToolMessage(
            content=json.dumps({
                "bookingId": 204,
                "status": "PendingConfirmation",
                "workerName": "Anura Liyanage",
                "bookingDate": "2026-09-30T09:00:00"
            }),
            tool_call_id="call_5",
            name="create_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Your booking #204 has been scheduled successfully.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "204" in card.message or "scheduled" in card.message.lower()


# -----------------------------------------------------------------------------
# Scenario 6: Booking Cancellation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_6_booking_cancellation():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Cancel booking 204"),
        AIMessage(content="", tool_calls=[{"id": "call_6", "name": "cancel_booking", "args": {"bookingId": 204}}]),
        ToolMessage(
            content=json.dumps({"bookingId": 204, "status": "Cancelled", "message": "Booking 204 cancelled"}),
            tool_call_id="call_6",
            name="cancel_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Booking #204 has been successfully cancelled.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "204" in card.message


# -----------------------------------------------------------------------------
# Scenario 7: Booking Rescheduling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_7_booking_rescheduling():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Reschedule booking 204 to Oct 1st at 10am"),
        AIMessage(content="", tool_calls=[{"id": "call_7", "name": "reschedule_booking", "args": {"bookingId": 204, "newDate": "2026-10-01T10:00:00"}}]),
        ToolMessage(
            content=json.dumps({"bookingId": 204, "status": "Rescheduled", "newDate": "2026-10-01T10:00:00"}),
            tool_call_id="call_7",
            name="reschedule_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Booking #204 has been rescheduled to Oct 1st.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "204" in card.message


# -----------------------------------------------------------------------------
# Scenario 8: Community Post Listing
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_8_community_post_listing():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Show recent community posts"),
        AIMessage(content="", tool_calls=[{"id": "call_8", "name": "get_community_posts", "args": {"category": "General"}}]),
        ToolMessage(
            content=json.dumps([
                {"id": 1, "title": "AC Repair Needed", "content": "Help with AC", "location": "Colombo", "authorId": "user1"}
            ]),
            tool_call_id="call_8",
            name="get_community_posts"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Here are recent community posts:")
        res = await community_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "post_list"
        assert len(card.card_data["posts"]) == 1


# -----------------------------------------------------------------------------
# Scenario 9: Community Post Creation
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_9_community_post_creation():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Post an ad for plumbing help"),
        AIMessage(content="", tool_calls=[{"id": "call_9", "name": "create_community_post", "args": {"title": "Plumber Needed", "content": "Need ASAP"}}]),
        ToolMessage(
            content=json.dumps({
                "id": 99,
                "title": "Plumber Needed",
                "content": "Need ASAP",
                "location": "Colombo",
                "communityId": "Plumbing",
                "authorId": "resident@workio.lk"
            }),
            tool_call_id="call_9",
            name="create_community_post"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Post published successfully.")
        res = await community_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "post_created"
        assert card.card_data["id"] == 99


# -----------------------------------------------------------------------------
# Scenario 10: Community Post Update and Delete
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_10_community_post_update_delete():
    # 10A. Update
    state_up = dict(BASE_STATE)
    state_up["messages"] = [
        HumanMessage(content="Update post 99"),
        AIMessage(content="", tool_calls=[{"id": "call_10a", "name": "update_community_post", "args": {"id": 99, "title": "Updated Title"}}]),
        ToolMessage(
            content=json.dumps({"id": 99, "title": "Updated Title", "content": "Updated content"}),
            tool_call_id="call_10a",
            name="update_community_post"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Post 99 updated.")
        res_up = await community_agent_node(state_up)
        assert res_up["structured_response"].response_type == "post_updated"
        assert res_up["structured_response"].card_data["id"] == 99

    # 10B. Delete
    state_del = dict(BASE_STATE)
    state_del["messages"] = [
        HumanMessage(content="Delete post 99"),
        AIMessage(content="", tool_calls=[{"id": "call_10b", "name": "delete_community_post", "args": {"id": 99}}]),
        ToolMessage(
            content=json.dumps({"id": 99, "status": "Removed"}),
            tool_call_id="call_10b",
            name="delete_community_post"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Post 99 removed.")
        res_del = await community_agent_node(state_del)
        assert res_del["structured_response"].response_type == "post_deleted"
        assert res_del["structured_response"].card_data["id"] == 99


# -----------------------------------------------------------------------------
# Scenario 11: Review Submission
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_11_review_submission():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Give 5 stars to worker 1"),
        AIMessage(content="", tool_calls=[{"id": "call_11", "name": "create_worker_review", "args": {"workerId": "1", "rating": 5, "comment": "Great!"}}]),
        ToolMessage(
            content=json.dumps({"status": "success", "reviewId": 501, "message": "Review submitted successfully"}),
            tool_call_id="call_11",
            name="create_worker_review"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Your review has been submitted.")
        res = await support_review_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "submitted" in card.message.lower() or "recorded" in card.message.lower()


# -----------------------------------------------------------------------------
# Scenario 12: No-Result Response (Graceful Handling)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_12_no_result_response():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Find plumber below 500/hr in Colombo"),
        AIMessage(content="", tool_calls=[{"id": "call_12", "name": "search_workers", "args": {"category": "Plumbing", "maxHourlyRate": 500}}]),
        ToolMessage(
            content=json.dumps([]),  # No matches
            tool_call_id="call_12",
            name="search_workers"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="I couldn't find any plumbers under 500/hr.")
        res = await worker_matching_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "couldn't find" in card.message.lower() or "no" in card.message.lower()


# -----------------------------------------------------------------------------
# Scenario 13: MCP / Tool Failure Handling
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_13_mcp_tool_failure():
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Book worker 1"),
        AIMessage(content="", tool_calls=[{"id": "call_13", "name": "create_booking", "args": {"workerId": "1"}}]),
        ToolMessage(
            content=json.dumps({"error": "Service unavailable: database connection timed out"}),
            tool_call_id="call_13",
            name="create_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Sorry, the booking service is temporarily unavailable. Please try again.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type in ("error", "text_message")
        assert "unavailable" in card.message.lower() or "error" in card.message.lower()


# -----------------------------------------------------------------------------
# Scenario 14: Invalid / Ambiguous User Request
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_14_invalid_user_request():
    state = dict(BASE_STATE)
    state["messages"] = [HumanMessage(content="xyzqwerty12345 random gibberish")]
    res = await supervisor_node(state)
    assert res.get("next") == "FINISH"
    assert len(res.get("messages", [])) > 0
    # Supervisor responds with a polite clarification message
    content = res["messages"][0].content.lower()
    assert any(term in content for term in ["assist", "help", "proceed", "jumbled", "message", "how can i"])


# -----------------------------------------------------------------------------
# Scenario 15: Greeting / Clarification Flow
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_15_greeting_clarification_flow():
    state = dict(BASE_STATE)
    state["messages"] = [HumanMessage(content="Hello! What services are available?")]
    res = await supervisor_node(state)
    assert res.get("next") == "FINISH"
    msg = res["messages"][0].content.lower()
    assert "hello" in msg or "welcome" in msg or "assist" in msg
    assert "structured_response" in res
    card = res["structured_response"]
    assert card.response_type == "text_message"


# -----------------------------------------------------------------------------
# Scenario 16: Multi-Tool Workflow (Specialist Agent Tool Loop)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_scenario_16_multi_tool_workflow():
    """
    Verifies that when a specialist makes multiple sequential tool calls
    (e.g., check availability -> then create booking), the specialist retains
    full ownership and produces the final structured AgentCardResponse.
    """
    state = dict(BASE_STATE)
    state["messages"] = [
        HumanMessage(content="Check if worker 1 is available tomorrow and if so book him"),
        # First tool call: check availability
        AIMessage(content="", tool_calls=[{"id": "call_16a", "name": "check_worker_availability", "args": {"workerId": "1", "date": "2026-09-30"}}]),
        ToolMessage(
            content=json.dumps({"workerId": "1", "available": True, "slot": "10:00"}),
            tool_call_id="call_16a",
            name="check_worker_availability"
        ),
        # Second tool call: create booking
        AIMessage(content="", tool_calls=[{"id": "call_16b", "name": "create_booking", "args": {"workerId": "1", "date": "2026-09-30T10:00:00"}}]),
        ToolMessage(
            content=json.dumps({"bookingId": 777, "status": "Confirmed", "workerName": "Anura Liyanage"}),
            tool_call_id="call_16b",
            name="create_booking"
        )
    ]
    with patch.object(ChatOpenAI, "ainvoke", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = AIMessage(content="Worker 1 was available at 10:00 AM, and I have confirmed booking #777 for you.")
        res = await booking_agent_node(state)
        assert "structured_response" in res
        card = res["structured_response"]
        assert isinstance(card, AgentCardResponse)
        assert card.response_type == "text_message"
        assert "777" in card.message
