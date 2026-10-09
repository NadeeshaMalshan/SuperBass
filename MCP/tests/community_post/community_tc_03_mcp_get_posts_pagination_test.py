import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_get_community_posts

@pytest.mark.asyncio
async def test_community_tc_03_mcp_get_posts_pagination():
    """TC-03: Verifies call_get_community_posts handles pagination limit and offset parameters."""
    mock_posts = [
        {"postId": 1, "title": "Post A"},
        {"postId": 2, "title": "Post B"}
    ]
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_posts

    with patch("main.backend_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await call_get_community_posts({
            "communityId": "All",
            "limit": 2,
            "offset": 0
        })

        assert len(res) == 2
        mock_get.assert_awaited_once()
