import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_create_community_post

@pytest.mark.asyncio
async def test_community_tc_08_mcp_image_attachments():
    """TC-08: Verifies call_create_community_post forwards attached image URLs in the request payload."""
    mock_resp = MagicMock()
    mock_resp.status_code = 201
    mock_resp.text = '{"postId": 88}'
    mock_resp.json.return_value = {"postId": 88}

    images = ["https://res.cloudinary.com/workio/1.png", "https://res.cloudinary.com/workio/2.png"]

    with patch("main.backend_client.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await call_create_community_post({
            "title": "Broken Windows",
            "content": "Glass cracked in living room",
            "images": images
        })

        assert res["postId"] == 88
        called_args = mock_post.await_args[1]["json"]
        assert called_args["images"] == images
