import pytest
from starlette.testclient import TestClient
from main import app

client = TestClient(app)


def test_booking_tools_discovery_complete():
    """Verify all 5 booking tools are advertised in tools/list response."""
    request_payload = {
        "jsonrpc": "2.0",
        "id": "list-req-1",
        "method": "tools/list",
        "params": {}
    }
    response = client.post("/mcp", json=request_payload)
    assert response.status_code == 200
    data = response.json()
    tools_list = data.get("result", {}).get("tools", [])
    registered_names = {t["name"] for t in tools_list}

    expected_tools = {
        "create_booking",
        "get_booking",
        "get_resident_bookings",
        "cancel_booking",
        "check_worker_availability",
    }

    assert expected_tools.issubset(registered_names), f"Missing tools: {expected_tools - registered_names}"
