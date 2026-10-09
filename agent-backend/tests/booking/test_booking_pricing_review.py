import pytest
from agent_backend.schemas.card_models import BookingConfirmationReviewCard


def test_booking_confirmation_review_card():
    """Verify BookingConfirmationReviewCard handles pricing and confirmation prompts."""
    card = BookingConfirmationReviewCard(
        workerId="5",
        workerName="Priyantha Perera",
        jobTitle="Bathroom Pipe Replacement",
        scheduledDate="2026-10-30T10:00:00Z",
        locationAddress="Homagama",
        contactPhone="0712345678",
        hourlyRate=3000.0,
        estimatedPrice=6000.0,
        confirmPrompt="CONFIRM_BOOKING: Yes please",
        cancelPrompt="CANCEL_BOOKING: No thank you"
    )
    assert card.hourlyRate == 3000.0
    assert card.estimatedPrice == 6000.0
    assert "CONFIRM_BOOKING" in card.confirmPrompt
    assert "CANCEL_BOOKING" in card.cancelPrompt
