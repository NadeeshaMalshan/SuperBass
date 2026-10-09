import pytest
from main import TOOL_FUNCTIONS


def test_booking_tool_handlers_mapped():
    """Verify all booking-related handlers are registered in TOOL_FUNCTIONS."""
    booking_tools = [
        "create_booking",
        "get_booking",
        "get_resident_bookings",
        "cancel_booking",
        "check_worker_availability",
    ]
    for tool_name in booking_tools:
        assert tool_name in TOOL_FUNCTIONS, f"{tool_name} must be mapped in TOOL_FUNCTIONS"
        assert callable(TOOL_FUNCTIONS[tool_name]), f"{tool_name} handler must be callable"
