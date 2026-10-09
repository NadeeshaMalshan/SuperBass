import pytest
from agent_backend.schemas.card_models import BookingListCard, BookingSummary
from agent_backend.tools.booking_tools import get_resident_bookings


def test_booking_list_card_model():
    """Verify BookingListCard correctly aggregates booking summaries."""
    summary = BookingSummary(
        id=12,
        workerId=3,
        workerName="Saman Kumara",
        jobTitle="Tile Grouting",
        status="Confirmed"
    )
    card = BookingListCard(
        totalCount=1,
        statusFilter="Upcoming",
        bookings=[summary]
    )
    assert card.totalCount == 1
    assert len(card.bookings) == 1
    assert card.bookings[0].workerName == "Saman Kumara"


def test_get_resident_bookings_tool_signature():
    """Verify get_resident_bookings tool schema."""
    assert get_resident_bookings.name == "get_resident_bookings"
    args = get_resident_bookings.args
    assert "residentId" in args
    assert "upcomingOnly" in args
