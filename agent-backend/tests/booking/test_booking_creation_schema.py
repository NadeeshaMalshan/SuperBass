import pytest
from agent_backend.schemas.card_models import BookingFormCard
from agent_backend.tools.booking_tools import create_booking


def test_booking_form_card_schema():
    """Verify BookingFormCard Pydantic schema validation."""
    card = BookingFormCard(
        workerId="10",
        workerName="Sunil Perera",
        category="Plumbing",
        hourlyRate=2800.0,
        location="Ratnapura",
        contactPhone="0771234567",
        jobTitle="Repair leaking bathroom tap",
        priority="Normal"
    )
    assert card.workerId == "10"
    assert card.workerName == "Sunil Perera"
    assert card.hourlyRate == 2800.0
    assert card.priority == "Normal"


def test_create_booking_tool_schema():
    """Verify create_booking tool definition and required arguments."""
    assert create_booking.name == "create_booking"
    args = create_booking.args
    assert "workerId" in args
    assert "residentId" in args
    assert "startTime" in args
    assert "endTime" in args
    assert "jobTitle" in args
