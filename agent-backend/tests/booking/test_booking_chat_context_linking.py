import pytest
from agent_backend.schemas.card_models import AgentCardResponse, BookingConfirmedCard


def test_booking_to_chat_linking_in_card_response():
    """Verify BookingConfirmedCard data contains worker details needed for chat initiation."""
    confirmed = BookingConfirmedCard(
        bookingId=99,
        workerId=7,
        workerName="Samantha Perera",
        jobTitle="Drain Unclogging",
        scheduledDate="2026-10-22T09:00:00Z",
        locationAddress="Moratuwa",
        contactPhone="0781234567",
        status="Confirmed"
    )
    response = AgentCardResponse(
        response_type="booking_confirmed",
        message="Your appointment is confirmed! You can chat with Samantha Perera anytime.",
        card_data=confirmed.model_dump(),
        metadata={"workerId": 7, "workerName": "Samantha Perera", "bookingId": 99}
    )
    assert response.response_type == "booking_confirmed"
    assert response.card_data["workerId"] == 7
    assert response.card_data["bookingId"] == 99
    assert response.metadata["workerName"] == "Samantha Perera"
