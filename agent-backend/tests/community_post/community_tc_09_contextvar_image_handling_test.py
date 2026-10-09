import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import create_community_post, current_post_images

@pytest.mark.asyncio
async def test_community_tc_09_contextvar_image_handling():
    """TC-09: Verifies current_post_images ContextVar safely injects image attachments into MCP call."""
    test_images = ["https://res.cloudinary.com/workio/img1.png", "https://res.cloudinary.com/workio/img2.png"]
    token = current_post_images.set(test_images)

    try:
        with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
            mock_mcp.return_value = {"postId": 12, "images": test_images}

            result = await create_community_post.ainvoke({
                "authorId": "user@workio.lk",
                "title": "Roof Tiles Cracked",
                "content": "Need replacement",
                "communityId": "Roofing"
            })

            args = mock_mcp.await_args[0][1]
            assert args["images"] == test_images
    finally:
        current_post_images.reset(token)
