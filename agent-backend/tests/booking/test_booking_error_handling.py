import pytest
from agent_backend.schemas.card_models import ErrorCard


def test_booking_error_card_model():
    """Verify ErrorCard handles booking validation errors gracefully."""
    card = ErrorCard(
        errorCode="BOOKING_SLOT_UNAVAILABLE",
        message="The selected technician is already booked for this time slot.",
        actionRequired="Please choose a different time or select another available technician."
    )
    assert card.errorCode == "BOOKING_SLOT_UNAVAILABLE"
    assert "already booked" in card.message
    assert card.actionRequired is not None
