import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import get_community_posts

@pytest.mark.asyncio
async def test_community_tc_03_filter_category():
    """TC-03: Verifies filtering community posts by a specific trade category like Electrical."""
    mock_posts = [
        {"postId": 10, "title": "Wiring Issue", "communityId": "Electrical"}
    ]

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_posts

        result = await get_community_posts.ainvoke({
            "communityId": "Electrical"
        })

        assert len(result) == 1
        assert result[0]["communityId"] == "Electrical"
        mock_mcp.assert_awaited_once_with(
            "get_community_posts",
            {"communityId": "Electrical", "limit": 10, "offset": 0}
        )
