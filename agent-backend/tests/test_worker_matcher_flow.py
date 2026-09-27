"""
Test Suite for Worker Matcher Flow.
Validates all 10 required test cases:
1. "Find me a plumber."
2. "Find me a plumber in Malabe."
3. "Find me a plumber in Malabe under Rs. 3000."
4. "Find me an electrician with a rating above 4.5."
5. "Find me an AC repair technician near Colombo."
6. "Find me a carpenter within 10 km."
7. A request where no workers match.
8. A request with incomplete information.
9. A request containing multiple requirements.
10. A normal non-worker request to ensure it is not incorrectly routed to Worker Matcher.
"""

import pytest
import asyncio
import json
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from agent_backend.graph.workflow import graph, build_graph
from agent_backend.agents.supervisor import supervisor_node
from agent_backend.agents.worker_matching_agent import worker_matching_agent_node
from agent_backend.agents.card_formatter import _deterministic_card_builder
from agent_backend.tools.worker_tools import WORKER_TOOLS, search_workers, get_worker_details, get_worker_performance
from agent_backend.schemas.card_models import (
    WorkerCardItem,
    WorkerListCard,
    WorkerDetailCard,
    AgentCardResponse
)


def test_worker_card_schemas():
    """Verify Worker UI Card models instantiate and serialize as expected."""
    worker = WorkerCardItem(
        id=1,
        name="Sunil Perera",
        service="Plumbing",
        skills=["Pipe Fitting", "Leak Repair"],
        rating=4.8,
        price=2500.0,
        pricingModel="Hourly",
        location="Malabe",
        distance=3.2,
        isAvailable=True,
        experienceYears=5,
        completedJobs=42
    )
    assert worker.name == "Sunil Perera"
    assert worker.price == 2500.0
    assert worker.rating == 4.8
    assert worker.location == "Malabe"

    list_card = WorkerListCard(
        skill="Plumbing",
        location="Malabe",
        totalCount=1,
        workers=[worker]
    )
    assert list_card.totalCount == 1
    assert list_card.workers[0].service == "Plumbing"

    detail_card = WorkerDetailCard(
        worker=worker,
        description="Expert residential and commercial plumbing specialist.",
        email="sunil@superbass.lk",
        phoneNo="0771234567",
        acceptanceRate="95.0%",
        completionRate="98.0%",
        cancellationRate="2.0%",
        qualityRating=5,
        punctualityRating=5,
        communicationRating=4
    )
    assert detail_card.worker.id == 1
    assert detail_card.qualityRating == 5


def test_worker_tools_definition():
    """Verify that all 3 required Worker tools are correctly exposed and named."""
    tool_names = [t.name for t in WORKER_TOOLS]
    assert "search_workers" in tool_names
    assert "get_worker_details" in tool_names
    assert "get_worker_performance" in tool_names
    assert len(WORKER_TOOLS) == 3


@pytest.mark.asyncio
async def test_supervisor_routing_all_cases():
    """
    Verify Supervisor correctly routes worker requests (Test Cases 1-6, 7, 8, 9)
    to worker_matching_agent, while non-worker requests (Test Case 10) are routed elsewhere.
    """
    cases = [
        # 1. Basic trade query
        ("Find me a plumber.", "worker_matching_agent"),
        # 2. Trade + location
        ("Find me a plumber in Malabe.", "worker_matching_agent"),
        # 3. Trade + location + budget
        ("Find me a plumber in Malabe under Rs. 3000.", "worker_matching_agent"),
        # 4. Trade + rating
        ("Find me an electrician with a rating above 4.5.", "worker_matching_agent"),
        # 5. Complex service + location
        ("Find me an AC repair technician near Colombo.", "worker_matching_agent"),
        # 6. Trade + distance radius
        ("Find me a carpenter within 10 km.", "worker_matching_agent"),
        # 7. Unmatched / niche trade request
        ("Find me an underwater welder in Malabe under Rs. 500.", "worker_matching_agent"),
        # 8. Incomplete query
        ("I need a technician.", "worker_matching_agent"),
        # 9. Multiple compound requirements
        ("Look for a top rated painter in Kandy available today under 4000 per day.", "worker_matching_agent"),
        # 10. Non-worker community request
        ("Create a community post about road maintenance.", "community_agent"),
        # 10b. Non-worker booking request
        ("Book an appointment for tomorrow at 10 AM.", "booking_agent"),
        # 10c. General greeting
        ("Hello, how can you help me?", "FINISH")
    ]

    for user_msg, expected_agent in cases:
        state = {
            "messages": [HumanMessage(content=user_msg)],
            "email": "resident@superbass.lk",
            "user_type": "Resident"
        }
        res = await supervisor_node(state)
        actual = res.get("next")
        assert actual == expected_agent, f"Message '{user_msg}' routed to '{actual}', expected '{expected_agent}'"


@pytest.mark.asyncio
async def test_worker_matcher_agent_execution():
    """Verify that worker_matching_agent_node processes user state and returns an AI message."""
    state = {
        "messages": [HumanMessage(content="Find me a plumber in Malabe under Rs. 3000.")],
        "email": "resident@superbass.lk",
        "user_type": "Resident"
    }
    result = await worker_matching_agent_node(state)
    assert "messages" in result
    assert len(result["messages"]) > 0
    assert result["messages"][0].content != ""


def test_card_formatter_worker_list():
    """Verify deterministic card formatting on search_workers tool output."""
    mock_workers = [
        {
            "id": 1,
            "name": "Kamal Perera",
            "skills": [{"serviceName": "Plumbing", "skillName": "Pipe Repair", "experienceYears": 4}],
            "hourlyRate": 2500,
            "overallRating": 4.9,
            "primaryServiceArea": "Malabe",
            "distance": 2.5,
            "isAvailable": True,
            "completedJobs": 35
        },
        {
            "id": 2,
            "name": "Nimal Silva",
            "skills": [{"serviceName": "Plumbing", "skillName": "Drain Cleaning", "experienceYears": 6}],
            "hourlyRate": 2800,
            "overallRating": 4.6,
            "primaryServiceArea": "Malabe",
            "distance": 4.1,
            "isAvailable": True,
            "completedJobs": 20
        }
    ]

    state = {
        "messages": [
            HumanMessage(content="Find me a plumber in Malabe under Rs. 3000."),
            AIMessage(content="Searching for plumbers in Malabe..."),
            ToolMessage(
                tool_call_id="call_1",
                name="search_workers",
                content=json.dumps(mock_workers)
            ),
            AIMessage(content="I found 2 top-rated plumbers in Malabe within your budget:")
        ],
        "email": "resident@superbass.lk",
        "user_type": "Resident"
    }

    card_response = _deterministic_card_builder(state)
    assert card_response.response_type == "worker_list"
    assert card_response.card_data["totalCount"] == 2
    assert len(card_response.card_data["workers"]) == 2
    assert card_response.card_data["workers"][0]["name"] == "Kamal Perera"
    assert card_response.card_data["workers"][0]["price"] == 2500.0
    assert card_response.card_data["workers"][0]["rating"] == 4.9


def test_card_formatter_worker_detail():
    """Verify deterministic card formatting on get_worker_performance tool output."""
    mock_perf = {
        "id": 1,
        "name": "Kamal Perera",
        "overallRating": 4.9,
        "completedJobs": 35,
        "isAvailable": True,
        "acceptanceRate": "96.5%",
        "completionRate": "100.0%",
        "cancellationRate": "0.0%",
        "qualityRating": 5,
        "punctualityRating": 5,
        "communicationRating": 5
    }

    state = {
        "messages": [
            HumanMessage(content="What is Kamal Perera's performance record?"),
            AIMessage(content="Retrieving performance metrics..."),
            ToolMessage(
                tool_call_id="call_2",
                name="get_worker_performance",
                content=json.dumps(mock_perf)
            ),
            AIMessage(content="Here are Kamal Perera's performance metrics.")
        ],
        "email": "resident@superbass.lk",
        "user_type": "Resident"
    }

    card_response = _deterministic_card_builder(state)
    assert card_response.response_type == "worker_detail"
    assert card_response.card_data["worker"]["name"] == "Kamal Perera"
    assert card_response.card_data["acceptanceRate"] == "96.5%"
    assert card_response.card_data["qualityRating"] == 5


def test_graph_structure_has_worker_nodes():
    """Verify the assembled LangGraph contains worker_matching_agent and worker_tools."""
    nodes = list(graph.nodes.keys())
    assert "supervisor" in nodes
    assert "worker_matching_agent" in nodes
    assert "worker_tools" in nodes
    assert "card_formatter" in nodes
