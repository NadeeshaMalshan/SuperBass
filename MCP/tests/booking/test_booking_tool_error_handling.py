import pytest
from starlette.testclient import TestClient
from main import app

client = TestClient(app)


def test_unknown_tool_returns_jsonrpc_error():
    """Verify calling an unknown tool returns JSON-RPC error or error response."""
    request_payload = {
        "jsonrpc": "2.0",
        "id": "err-test-1",
        "method": "tools/call",
        "params": {
            "name": "non_existent_booking_tool",
            "arguments": {}
        }
    }
    response = client.post("/mcp", json=request_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    # Should contain error object according to JSON-RPC spec
    assert "error" in data or data.get("result", {}).get("isError") is True
