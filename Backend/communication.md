6. Component 3 — Booking & Communication
Purpose
Manage the actual service transaction lifecycle and communication between residents and workers.
Booking Lifecycle
Booking Requested
↓
Worker Accepts / Rejects
↓
Confirmed
↓
In Progress
↓
Completed
↓
Reviewed
CRUD
Create
• 
• 
• 
• 
Read
• 
• 
• 
• 
• 
Booking
Conversation
Message
Booking-related attachment
Booking details
Booking history
Conversation
Messages
Booking status
Update
• 
• 
• 
• 
Reschedule booking
Update booking status
Mark job as started
Mark job as completed
Delete
• 
• 
Cancel booking
Remove permitted messages/attachments
7
Communication Features
• 
• 
• 
• 
• 
• 
• 
• 
Resident ↔ Worker chat
Text messages
Image sharing
Booking-related messages
Job updates
Read status
Notifications
Booking reminders
The original proposal already defines the booking lifecycle, chat and communication APIs. 

Booking & Communication APIs
POST   /api/bookings
GET    
/api/bookings/{id}
PUT    
/api/bookings/{id}
POST   /api/bookings/{id}/accept
POST   /api/bookings/{id}/reject
POST   /api/bookings/{id}/cancel
POST   /api/bookings/{id}/reschedule
GET    
/api/conversations/{id}/messages
POST   /api/conversations/{id}/message