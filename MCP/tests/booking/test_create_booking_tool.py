import pytest
from main import tools


def test_create_booking_tool_schema():
    """Verify create_booking tool is registered with correct schema in MCP."""
    tool = next((t for t in tools if t["name"] == "create_booking"), None)
    assert tool is not None, "create_booking tool must be registered in tools list"
    schema = tool["inputSchema"]
    assert schema["type"] == "object"
    assert "workerId" in schema["properties"]
    assert "residentId" in schema["properties"]
    assert "startTime" in schema["properties"]
    assert "endTime" in schema["properties"]
    assert set(schema["required"]) == {"workerId", "residentId", "startTime", "endTime"}
