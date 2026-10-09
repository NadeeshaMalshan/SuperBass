import pytest
from main import tools


def test_check_worker_availability_tool_schema():
    """Verify check_worker_availability tool schema in MCP."""
    tool = next((t for t in tools if t["name"] == "check_worker_availability"), None)
    assert tool is not None, "check_worker_availability tool must be registered in tools list"
    schema = tool["inputSchema"]
    assert "workerId" in schema["properties"]
    assert "startTime" in schema["properties"]
    assert "endTime" in schema["properties"]
    assert set(schema["required"]) == {"workerId", "startTime", "endTime"}
