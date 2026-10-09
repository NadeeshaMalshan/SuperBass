import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import get_user_community_posts

@pytest.mark.asyncio
async def test_community_tc_06_user_posts():
    """TC-06: Verifies get_user_community_posts retrieves user's own published posts and strips whitespace."""
    mock_posts = [
        {"postId": 1, "title": "My Post 1", "authorId": "user@workio.lk"},
        {"postId": 2, "title": "My Post 2", "authorId": "user@workio.lk"}
    ]

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_posts

        result = await get_user_community_posts.ainvoke({
            "email": "  user@workio.lk  "
        })

        assert len(result) == 2
        mock_mcp.assert_awaited_once_with(
            "get_user_community_posts",
            {"email": "user@workio.lk"}
        )
