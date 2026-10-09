import pytest
from main import tools, TOOL_FUNCTIONS


def test_user_and_worker_lookup_tools_registered():
    """Verify get_user_details and get_worker_details tools are registered for participant resolution."""
    user_tool = next((t for t in tools if t["name"] == "get_user_details"), None)
    assert user_tool is not None, "get_user_details must exist for chat participant lookup"
    assert "email" in user_tool["inputSchema"]["required"]

    worker_tool = next((t for t in tools if t["name"] == "get_worker_details"), None)
    assert worker_tool is not None, "get_worker_details must exist for worker profile lookup"
    assert "workerId" in worker_tool["inputSchema"]["required"]

    assert "get_user_details" in TOOL_FUNCTIONS
    assert "get_worker_details" in TOOL_FUNCTIONS
