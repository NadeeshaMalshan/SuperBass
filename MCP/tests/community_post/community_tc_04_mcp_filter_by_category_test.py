import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_get_community_posts

@pytest.mark.asyncio
async def test_community_tc_04_mcp_filter_by_category():
    """TC-04: Verifies call_get_community_posts filters by specific category when category is not 'All'."""
    mock_posts = [
        {"postId": 10, "serviceCategoryName": "Masonry", "title": "Brick repair"}
    ]
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_posts

    with patch("main.backend_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await call_get_community_posts({
            "communityId": "Masonry"
        })

        assert len(res) == 1
        called_params = mock_get.await_args[1]["params"]
        assert called_params["category"].lower() == "masonry"
