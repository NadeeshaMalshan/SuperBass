import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_get_user_community_posts

@pytest.mark.asyncio
async def test_community_tc_07_mcp_user_posts():
    """TC-07: Verifies call_get_user_community_posts fetches posts for a specific email."""
    mock_posts = [{"postId": 1, "title": "User Post"}]
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_posts

    with patch("main.backend_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await call_get_user_community_posts({"email": "resident@workio.lk"})

        assert len(res) == 1
        mock_get.assert_awaited_once()
        url = mock_get.await_args[0][0]
        assert "resident@workio.lk" in url
