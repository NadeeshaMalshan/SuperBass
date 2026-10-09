import pytest
from main import tools


def test_cancel_booking_tool_schema():
    """Verify cancel_booking tool is registered with bookingId and optional reason."""
    tool = next((t for t in tools if t["name"] == "cancel_booking"), None)
    assert tool is not None, "cancel_booking tool must be registered in tools list"
    schema = tool["inputSchema"]
    assert "bookingId" in schema["properties"]
    assert "reason" in schema["properties"]
    assert "bookingId" in schema["required"]
