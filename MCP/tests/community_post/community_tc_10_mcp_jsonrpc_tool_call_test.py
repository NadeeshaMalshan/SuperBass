import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_community_tc_10_mcp_jsonrpc_tool_call(client):
    """TC-10: Verifies full JSON-RPC 2.0 /mcp tools/call protocol dispatch for create_community_post."""
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.text = '{"postId": 999}'
    mock_resp.json.return_value = {"postId": 999}

    with patch("main.backend_client.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        payload = {
            "jsonrpc": "2.0",
            "id": "test-req-1",
            "method": "tools/call",
            "params": {
                "name": "create_community_post",
                "arguments": {
                    "authorId": "resident@workio.lk",
                    "title": "Protocol Test Post",
                    "content": "Testing JSON-RPC wrapper",
                    "communityId": "Plumbing"
                }
            }
        }

        response = client.post("/mcp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["jsonrpc"] == "2.0"
        assert data["id"] == "test-req-1"
        assert "result" in data
        assert data["result"]["postId"] == 999
