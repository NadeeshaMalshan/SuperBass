"""
API endpoint tests for SuperBass Agent Backend.
"""

import pytest
from starlette.testclient import TestClient
from agent_backend.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "agent-backend"


def test_mcp_health_endpoint():
    """Verify /api/mcp/health runs without crashing."""
    response = client.get("/api/mcp/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_chat_greeting_flow():
    """Verify /api/chat handles greeting and returns a text_message card."""
    payload = {
        "message": "Hello! What can you do?",
        "email": "kpjmp28@gmail.com",
        "user_type": "Resident"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "response" in data
    card_resp = data["response"]
    assert card_resp["response_type"] in ["text_message", "error"]
    assert "card_data" in card_resp
