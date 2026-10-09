import pytest
from starlette.testclient import TestClient
from main import app

client = TestClient(app)


def test_jsonrpc_tools_list_dispatch():
    """Verify POST /mcp dispatches tools/list method properly."""
    request_payload = {
        "jsonrpc": "2.0",
        "id": "test-req-1",
        "method": "tools/list",
        "params": {}
    }
    response = client.post("/mcp", json=request_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == "test-req-1"
    assert "result" in data
    tools_list = data["result"]["tools"]
    tool_names = [t["name"] for t in tools_list]
    assert "create_booking" in tool_names
    assert "cancel_booking" in tool_names
