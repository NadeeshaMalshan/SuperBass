"""
End-to-End Live System Test Suite for Workio Architecture A.
Tests the running FastAPI service, LangGraph Architecture A multi-agent flow,
MCP tool integration, and structured AgentCardResponse generation.
"""

import httpx
import json
import asyncio

BASE_URL = "http://localhost:8001"


SCENARIOS = [
    {
        "name": "Test 1 — Supervisor Greeting & Direct Structured Card",
        "payload": {
            "message": "Hello! How can you help me today?",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["text_message"]
    },
    {
        "name": "Test 2 — Worker Search (Worker Matching Agent + MCP search_workers)",
        "payload": {
            "message": "Find me a plumber near Colombo under 2500/hr",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["worker_list", "text_message"]
    },
    {
        "name": "Test 3 — Worker Details (Worker Matching Agent + MCP get_worker_details)",
        "payload": {
            "message": "Show me the details of worker 1",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["user_profile", "text_message"]
    },
    {
        "name": "Test 4 — Worker Performance (Support & Review Agent + MCP get_worker_performance)",
        "payload": {
            "message": "What is the performance rating and reviews for worker 1?",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["text_message", "user_profile"]
    },
    {
        "name": "Test 5 — Check Availability (Booking Agent + MCP check_worker_availability)",
        "payload": {
            "message": "Check worker availability for worker 1 for tomorrow morning",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["text_message"]
    },
    {
        "name": "Test 6 — Community Posts (Community Agent + MCP get_community_posts)",
        "payload": {
            "message": "Show me recent community posts in Colombo",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["post_list", "text_message"]
    },
    {
        "name": "Test 7 — Worker Review Submission (Support & Review Agent + MCP create_worker_review)",
        "payload": {
            "message": "I want to give 5 stars review to worker 1 for great plumbing work",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["text_message", "error"]
    },
    {
        "name": "Test 8 — Resident Bookings (Booking Agent + MCP get_resident_bookings)",
        "payload": {
            "message": "Show all my upcoming resident bookings",
            "email": "resident@workio.lk",
            "user_type": "Resident"
        },
        "expected_types": ["text_message"]
    }
]

from starlette.testclient import TestClient
from agent_backend.main import app
import time

def main():
    print("=" * 70)
    print("RUNNING IN-PROCESS FULL PIPELINE WORKIO ARCHITECTURE A TEST SUITE")
    print("=" * 70)

    with TestClient(app) as client:
        # Check health
        h_res = client.get("/health")
        print(f"[Health Check] /health: HTTP {h_res.status_code} -> {h_res.json()}")
        m_res = client.get("/api/mcp/health")
        print(f"[MCP Health Check] /api/mcp/health: HTTP {m_res.status_code} -> {m_res.json()}")

        passed = 0
        failed = 0

        for sc in SCENARIOS:
            print(f"\n--- {sc['name']} ---")
            print(f"Query: \"{sc['payload']['message']}\"")
            try:
                t0 = time.perf_counter()
                res = client.post("/api/chat", json=sc["payload"])
                duration = round((time.perf_counter() - t0) * 1000, 1)

                if res.status_code == 200:
                    data = res.json()
                    card = data.get("response", {})
                    resp_type = card.get("response_type")
                    agent_involved = card.get("metadata", {}).get("agent", "unknown")
                    tokens = card.get("metadata", {}).get("token_usage", {})
                    card_data_keys = list(card.get("card_data", {}).keys()) if isinstance(card.get("card_data"), dict) else []

                    print(f"Status: HTTP 200 ({duration}ms)")
                    print(f"Response Type: '{resp_type}' (Agent: {agent_involved})")
                    print(f"Message: {card.get('message', '')[:100]}...")
                    print(f"Card Data fields: {card_data_keys}")
                    print(f"Token Usage: {tokens}")

                    if resp_type in sc["expected_types"]:
                        print("[PASS] Response type matched expected schema.")
                        passed += 1
                    else:
                        print(f"[FAIL] Unexpected response_type: '{resp_type}', expected one of {sc['expected_types']}")
                        failed += 1
                else:
                    print(f"[FAIL] HTTP {res.status_code}: {res.text}")
                    failed += 1
            except Exception as ex:
                print(f"[FAIL] Exception during test: {ex}")
                failed += 1

        print("\n" + "=" * 70)
        print(f"SUMMARY: {passed} PASSED, {failed} FAILED across {len(SCENARIOS)} live scenarios.")
        print("=" * 70)

if __name__ == "__main__":
    main()

