import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import get_community_posts

@pytest.mark.asyncio
async def test_community_tc_02_get_posts_pagination():
    """TC-02: Verifies pagination parameters (limit and offset) when listing community posts."""
    mock_posts = [
        {"postId": 1, "title": "Post 1", "communityId": "All"},
        {"postId": 2, "title": "Post 2", "communityId": "All"}
    ]

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_posts

        result = await get_community_posts.ainvoke({
            "communityId": "All",
            "limit": 5,
            "offset": 10
        })

        assert isinstance(result, list)
        assert len(result) == 2
        mock_mcp.assert_awaited_once_with(
            "get_community_posts",
            {"communityId": "All", "limit": 5, "offset": 10}
        )
