# Booking & Chat Component Backend (.NET) Tests (Member 4)

Test files organized by purpose:
- `BookingCreationTests.cs` - Booking creation DTO validation and initial status
- `BookingLifecycleTests.cs` - Status lifecycle (Pending -> Accepted -> InProgress -> Completed)
- `BookingCancellationTests.cs` - Booking cancellation and worker rejection reasons
- `BookingQueryFilteringTests.cs` - Querying bookings by status and sorting by schedule
- `BookingScheduleConflictTests.cs` - Scheduling window overlap detection
- `BookingPricingCalculationTests.cs` - Pricing model (hourly/fixed) and price calculations
- `ChatConversationInitializationTests.cs` - Conversation entity creation and participants
- `ChatMessageDispatchTests.cs` - ChatMessage dispatch and persistence validation
- `ChatReadReceiptsTests.cs` - Read receipt timestamps and unread message count
- `BookingChatContextLinkingTests.cs` - Booking-to-conversation association and navigation

Run with:
```bash
dotnet test tests/ --filter FullyQualifiedName~Booking
```
