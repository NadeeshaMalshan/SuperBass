import pytest
from agent_backend.schemas.card_models import BookingConfirmedCard


def test_booking_confirmed_card_model():
    """Verify BookingConfirmedCard Pydantic schema serialization."""
    card = BookingConfirmedCard(
        bookingId=205,
        workerId=15,
        workerName="Kamal Gunaratne",
        jobTitle="Ceiling Wiring Check",
        scheduledDate="2026-10-18T10:00:00Z",
        locationAddress="Colombo 07",
        contactPhone="0779988776",
        status="Confirmed"
    )
    assert card.bookingId == 205
    assert card.status == "Confirmed"
    assert card.workerName == "Kamal Gunaratne"
    payload = card.model_dump()
    assert payload["bookingId"] == 205
    assert payload["status"] == "Confirmed"
