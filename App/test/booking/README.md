# Booking & Chat Component Flutter App Tests (Member 4)

Test files organized by purpose:
- `booking_creation_model_test.dart` - BookingModel deserialization from JSON
- `booking_lifecycle_status_test.dart` - Lifecycle states (Pending, Accepted, Completed)
- `booking_cancellation_reason_test.dart` - Cancellation reason and worker rejection notes
- `booking_list_sorting_test.dart` - Booking sorting by scheduled date and active filtering
- `booking_scheduling_datetime_test.dart` - ISO 8601 DateTime parsing and null-safety
- `booking_pricing_model_test.dart` - Numeric price extraction and pricing models
- `chat_unread_count_notifier_test.dart` - Unread chat count ValueNotifier updates
- `chat_realtime_streams_test.dart` - Broadcast stream verification for messages
- `chat_read_receipts_connection_test.dart` - SignalR connection state tracking
- `booking_chat_context_linking_test.dart` - Booking-to-chat conversation ID linking

Run with:
```bash
flutter test test/booking/
```
