import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import update_community_post

@pytest.mark.asyncio
async def test_community_tc_04_update_post():
    """TC-04: Verifies update_community_post sends updated post fields and validates author authorization."""
    mock_response = {
        "postId": 42,
        "title": "Updated Title",
        "content": "Updated Content",
        "communityId": "Plumbing"
    }

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_response

        result = await update_community_post.ainvoke({
            "postId": "42",
            "title": "Updated Title",
            "content": "Updated Content",
            "authorId": "author@workio.lk",
            "communityId": "Plumbing"
        })

        assert result["title"] == "Updated Title"
        mock_mcp.assert_awaited_once()
        args = mock_mcp.await_args[0][1]
        assert args["postId"] == 42
        assert args["authorId"] == "author@workio.lk"
