import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from main import call_get_service_categories

@pytest.mark.asyncio
async def test_community_tc_09_mcp_service_categories():
    """TC-09: Verifies call_get_service_categories returns list of categories from backend."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [{"id": "Plumbing", "name": "Plumbing"}]

    with patch("main.backend_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        res = await call_get_service_categories({})

        assert len(res) == 1
        assert res[0]["name"] == "Plumbing"
        mock_get.assert_awaited()
