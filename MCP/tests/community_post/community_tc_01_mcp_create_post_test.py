import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_create_community_post

@pytest.mark.asyncio
async def test_community_tc_01_mcp_create_post():
    """TC-01: Verifies call_create_community_post builds correct payload and posts to backend."""
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.text = '{"postId": 105, "title": "MCP Plumbing Request"}'
    mock_resp.json.return_value = {"postId": 105, "title": "MCP Plumbing Request"}

    with patch("main.backend_client.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await call_create_community_post({
            "authorId": "resident@workio.lk",
            "title": "MCP Plumbing Request",
            "content": "Water pipe burst in balcony",
            "communityId": "Plumbing",
            "location": "Kandy"
        })

        assert res["postId"] == 105
        mock_post.assert_awaited_once()
        called_args = mock_post.await_args[1]["json"]
        assert called_args["title"] == "MCP Plumbing Request"
        assert called_args["serviceCategoryId"] == "Plumbing"
        assert called_args["location"] == "Kandy"
