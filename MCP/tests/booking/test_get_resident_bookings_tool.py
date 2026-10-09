import pytest
from main import tools


def test_get_resident_bookings_tool_schema():
    """Verify get_resident_bookings tool schema in MCP."""
    tool = next((t for t in tools if t["name"] == "get_resident_bookings"), None)
    assert tool is not None, "get_resident_bookings tool must be registered in tools list"
    schema = tool["inputSchema"]
    assert "residentId" in schema["properties"]
    assert "upcomingOnly" in schema["properties"]
    assert "residentId" in schema["required"]
