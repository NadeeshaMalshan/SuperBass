import pytest
from agent_backend.tools.booking_tools import BOOKING_TOOLS


def test_booking_tools_registry_complete():
    """Verify all expected tools are present in BOOKING_TOOLS list."""
    tool_names = [t.name for t in BOOKING_TOOLS]
    assert "create_booking" in tool_names
    assert "get_resident_bookings" in tool_names
    assert "cancel_booking" in tool_names
    assert "check_worker_availability" in tool_names
    assert "get_booking_details" in tool_names
