import pytest
from agent_backend.tools.worker_matching_tools import search_workers
from agent_backend.tools.booking_tools import create_booking, get_resident_bookings, cancel_booking
from agent_backend.tools.support_review_tools import create_worker_review
from agent_backend.tools.community_tools import create_community_post, get_user_community_posts

@pytest.mark.asyncio
async def test_create_booking_valid(mock_mcp):
    mock_mcp.return_value = {"content": [{"text": '{"success": true}'}]}
    res = await create_booking.ainvoke({"workerId": "1", "residentId": "2", "startTime": "a", "endTime": "b", "jobTitle": "c", "locationAddress": "d", "contactPhone": "e"})
    assert res is not None
