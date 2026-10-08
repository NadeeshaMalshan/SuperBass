import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_delete_community_post

@pytest.mark.asyncio
async def test_community_tc_06_mcp_delete_post():
    """TC-06: Verifies call_delete_community_post issues DELETE request with requester email."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"message": "Post deleted successfully."}'
    mock_resp.json.return_value = {"message": "Post deleted successfully."}

    with patch("main.backend_client.delete", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = mock_resp
        res = await call_delete_community_post({
            "postId": 77,
            "authorId": "user@workio.lk"
        })

        assert "deleted" in res["message"]
        mock_delete.assert_awaited_once()
        url = mock_delete.await_args[0][0]
        assert "77" in url
