import pytest
from unittest.mock import AsyncMock, patch
from agent_backend.tools.community_tools import get_service_categories

@pytest.mark.asyncio
async def test_community_tc_10_service_categories_tool():
    """TC-10: Verifies get_service_categories returns the standardized list of service categories."""
    mock_categories = [
        {"id": "Plumbing", "name": "Plumbing"},
        {"id": "Electrical", "name": "Electrical"},
        {"id": "Carpentry", "name": "Carpentry"}
    ]

    with patch("agent_backend.tools.community_tools.mcp_client.call_tool", new_callable=AsyncMock) as mock_mcp:
        mock_mcp.return_value = mock_categories

        result = await get_service_categories.ainvoke({"includeDetails": True})

        assert len(result) == 3
        mock_mcp.assert_awaited_once_with(
            "get_service_categories",
            {"includeDetails": True}
        )
