import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import create_community_post

@pytest.mark.asyncio
async def test_community_tc_01_create_post_success():
    """TC-01: Verifies that create_community_post tool properly delegates to MCP client and returns sanitized output."""
    mock_response = {
        "postId": 101,
        "title": "Need urgent plumber in Colombo",
        "content": "Water leaking in kitchen",
        "communityId": "Plumbing",
        "location": "Colombo",
        "authorId": "testuser@workio.lk"
    }

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_response

        result = await create_community_post.ainvoke({
            "authorId": "testuser@workio.lk",
            "title": "Need urgent plumber in Colombo",
            "content": "Water leaking in kitchen",
            "communityId": "Plumbing",
            "location": "Colombo"
        })

        assert result["postId"] == 101
        assert result["communityId"] == "Plumbing"
        mock_mcp.assert_awaited_once()
        args = mock_mcp.await_args[0][1]
        assert args["authorId"] == "testuser@workio.lk"
        assert args["title"] == "Need urgent plumber in Colombo"
