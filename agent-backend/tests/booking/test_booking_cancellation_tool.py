import pytest
from agent_backend.tools.booking_tools import cancel_booking


def test_cancel_booking_tool_definition():
    """Verify cancel_booking tool exposes bookingId and reason."""
    assert cancel_booking.name == "cancel_booking"
    args = cancel_booking.args
    assert "bookingId" in args
    assert "reason" in args
