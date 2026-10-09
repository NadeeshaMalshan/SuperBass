import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import delete_community_post

@pytest.mark.asyncio
async def test_community_tc_05_delete_post():
    """TC-05: Verifies delete_community_post issues soft-delete request with correct post and author IDs."""
    mock_response = {
        "status": "success",
        "message": "Post 42 marked as Removed"
    }

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_response

        result = await delete_community_post.ainvoke({
            "postId": 42,
            "authorId": "author@workio.lk"
        })

        assert result["status"] == "success"
        mock_mcp.assert_awaited_once_with(
            "delete_community_post",
            {"postId": 42, "authorId": "author@workio.lk"}
        )
