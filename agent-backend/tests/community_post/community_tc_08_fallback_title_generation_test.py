import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import create_community_post

@pytest.mark.asyncio
async def test_community_tc_08_fallback_title_generation():
    """TC-08: Verifies that generic placeholder titles like 'Community Post' trigger automatic title generation."""
    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp, \
         patch("agent_backend.utils.card_builders.generate_issue_title", return_value="Urgent Pipe Leak Colombo") as mock_gen:

        mock_mcp.return_value = {"postId": 99, "title": "Urgent Pipe Leak Colombo"}

        result = await create_community_post.ainvoke({
            "authorId": "user@workio.lk",
            "title": "Community Post",  # Generic placeholder title
            "content": "Water is overflowing from bathroom",
            "communityId": "Plumbing"
        })

        mock_gen.assert_called_once()
        args = mock_mcp.await_args[0][1]
        assert args["title"] == "Urgent Pipe Leak Colombo"
