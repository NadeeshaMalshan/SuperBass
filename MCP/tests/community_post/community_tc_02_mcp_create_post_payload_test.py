import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_create_community_post

@pytest.mark.asyncio
async def test_community_tc_02_mcp_create_post_payload_defaults():
    """TC-02: Verifies fallback defaults when authorId or userName are not supplied."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"success": true}'
    mock_resp.json.return_value = {"success": True}

    with patch("main.backend_client.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await call_create_community_post({
            "title": "Need Help",
            "content": "Any carpenter available?"
        })

        assert res["success"] is True
        called_args = mock_post.await_args[1]["json"]
        assert called_args["userId"] == "resident@workio.lk"
        assert called_args["serviceCategoryId"] == "General"
        assert called_args["location"] == "Colombo"
