import pytest
from unittest.mock import patch, AsyncMock

@pytest.fixture
def mock_mcp():
    with patch('agent_backend.tools.mcp_client.mcp_client.call_tool', new_callable=AsyncMock) as mock:
        yield mock
