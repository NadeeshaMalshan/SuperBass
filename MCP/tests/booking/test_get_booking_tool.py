import pytest
from main import tools


def test_get_booking_tool_schema():
    """Verify get_booking tool is registered with bookingId parameter."""
    tool = next((t for t in tools if t["name"] == "get_booking"), None)
    assert tool is not None, "get_booking tool must be registered in tools list"
    schema = tool["inputSchema"]
    assert "bookingId" in schema["properties"]
    assert "bookingId" in schema["required"]
