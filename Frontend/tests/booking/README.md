# Booking & Chat Component Frontend Tests (Member 4)

Test files organized by purpose:
- `booking_creation_form.test.jsx` - Booking creation form inputs and submission
- `booking_confirmed_card.test.jsx` - Confirmed appointment status card display
- `booking_cancellation_flow.test.jsx` - Booking cancellation dialog and user rejection
- `booking_list_filtering.test.jsx` - Resident bookings list and status filtering
- `booking_scheduling_priority.test.jsx` - Date/time scheduling and priority selection
- `booking_pricing_calculation.test.jsx` - Hourly rate and estimated cost calculation
- `chat_modal_initialization.test.jsx` - Chat modal dialog and recipient setup
- `chat_signalr_messaging.test.jsx` - Real-time SignalR message dispatch
- `chat_read_receipts.test.jsx` - Read receipts and typing indicator state
- `booking_chat_context_linking.test.jsx` - Direct chat linking from booking cards

Run with:
```bash
npx vitest run tests/booking
```
