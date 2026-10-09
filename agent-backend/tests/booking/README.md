# Booking & Chat Component Agent Backend Tests (Member 4)

Test files organized by purpose:
- `test_booking_creation_schema.py` - BookingFormCard schema & create_booking tool definition
- `test_booking_confirmed_card.py` - BookingConfirmedCard schema & status verification
- `test_booking_cancellation_tool.py` - cancel_booking tool arguments and reason handling
- `test_booking_list_query.py` - BookingListCard aggregation and get_resident_bookings
- `test_booking_datetime_availability.py` - normalize_datetime_str and availability check
- `test_booking_pricing_review.py` - BookingConfirmationReviewCard pricing calculations
- `test_chat_agent_response.py` - AgentCardResponse envelope for chat text replies
- `test_booking_tools_registry.py` - BOOKING_TOOLS complete tool registry integrity
- `test_booking_error_handling.py` - ErrorCard handling for booking conflicts
- `test_booking_chat_context_linking.py` - BookingConfirmedCard worker linking for chat

Run with:
```bash
pytest tests/booking/ -v
```
