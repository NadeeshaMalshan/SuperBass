import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_update_community_post

@pytest.mark.asyncio
async def test_community_tc_05_mcp_update_post():
    """TC-05: Verifies call_update_community_post sends PUT request with updated title, content, and author verification."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"postId": 55, "title": "Updated Title via MCP"}'
    mock_resp.json.return_value = {"postId": 55, "title": "Updated Title via MCP"}

    with patch("main.backend_client.put", new_callable=AsyncMock) as mock_put:
        mock_put.return_value = mock_resp
        res = await call_update_community_post({
            "postId": 55,
            "title": "Updated Title via MCP",
            "content": "Updated description content",
            "authorId": "author@workio.lk"
        })

        assert res["title"] == "Updated Title via MCP"
        mock_put.assert_awaited_once()
        url = mock_put.await_args[0][0]
        assert "55" in url
