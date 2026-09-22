# Backend Documentation - Superbass Platform

The Superbass backend is a robust ASP.NET Core 8.0 Web API designed to power a community-driven home service platform. It facilitates the connection between residents needing services and skilled workers.

## 🏗️ Architecture Overview

- **Framework**: ASP.NET Core 8.0
- **Database**: PostgreSQL (via Entity Framework Core)
- **Authentication**: JWT (JSON Web Token) with Google OAuth 2.0 integration.
- **Real-time Communication**: SignalR for instant messaging and presence tracking.
- **Notifications**: OneSignal integration for push notifications to mobile devices.
- **Infrastructure**: Configurable for different environments (Development, Production/Docker) with .env support.

---

## 🚀 Core Features & API Endpoints

### 1. Authentication & User Management (`/api/Auth`)
Handles secure user entry and profile initialization.

| Endpoint | Method | Description | Key Request Fields |
| :--- | :--- | :--- | :--- |
| `/google` | `POST` | Validates Google token and signs in/registers user | `accessToken`, `idToken`, `phoneNo`, `address` |
| `/onboarding` | `POST` | Updates profile during first-time setup | `phoneNo`, `address`, `locationLat`, `locationLng` |

### 2. Worker Management (`/api/Workers`)
Handles worker profiles, skill sets, and the transition from Resident to Worker.

| Endpoint | Method | Description | Key Request Fields |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Lists all available workers | N/A |
| `/search` | `GET` | Finds workers by skill and location | `skill`, `location` |
| `/{id}` | `GET` | Gets detailed worker profile | `id` |
| `/me` | `GET` | Gets the authenticated user's worker profile | `email` (Optional) |
| `/become-worker` | `POST` | Upgrades a Resident to a Worker | `description`, `skills`, `pricingModel` |
| `/revert-to-resident`| `DELETE` | Removes worker profile | `email` (Optional) |
| `/{id}/performance` | `GET` | Returns rating and completion metrics | `id` |
| `/{id}/availability` | `PUT` | Updates worker availability/schedule | `isAvailable`, `scheduleJson` |
| `/{id}/pricing` | `PUT` | Updates rates (hourly/daily) | `pricingModel`, `hourlyRate`, `dailyRate` |
| `/{id}/service-area` | `PUT` | Updates coverage area and radius | `serviceArea`, `radiusKm` |
| `/{id}/skills` | `POST` | Adds a new skill to the worker's profile | `skillName`, `experienceYears` |

### 3. Booking System (`/api/Bookings`)
Manages the lifecycle of a service request from initiation to review.

| Endpoint | Method | Description | Core Logic |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | Creates a new booking request | Links to a chat, notifies worker via push |
| `/{id}` | `GET` | Gets booking details | Includes Resident and Worker info |
| `/resident` | `GET` | Lists all bookings for a specific resident | Filtered by email |
| `/worker` | `GET` | Lists all bookings for a worker | Filtered by workerId or email |
| `/{id}/accept` | `POST` | Worker confirms the booking | Updates status to `Confirmed`, notifies resident |
| `/{id}/reject` | `POST` | Worker declines the booking | Sets status to `Rejected`, records reason |
| `/{id}/start` | `POST` | Worker starts the job | Updates status to `InProgress` |
| `/{id}/complete` | `POST` | Worker marks job as finished | Updates status to `Completed`, prompts for review |
| `/{id}/cancel` | `POST` | Either party cancels the booking | Updates status to `Cancelled` |
| `/{id}/reschedule` | `POST` | Changes the scheduled date/time | Updates timing, notifies via chat |
| `/{id}/review` | `POST` | Resident rates the worker | Calculates and updates worker's average ratings |

### 4. Real-time Messaging (`/api/Conversations`)
Provides a full-featured chat system integrated with bookings.

| Endpoint | Method | Description | Key Feature |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Lists all conversations for a user | Pagination supported |
| `/{id}` | `GET` | Gets a specific conversation thread | Access control verified |
| `/` | `POST` | Creates or retrieves a chat with a worker | Automatic linking to `WorkerId` |
| `/{id}/messages` | `GET` | Retrieves message history | `page` and `pageSize` query params |
| `/{id}/messages` | `POST` | Sends a new message | SignalR broadcast + OneSignal push |
| `/{id}/read` | `PUT`/`POST` | Marks messages as read | Triggers `MessagesRead` SignalR event |
| `/{id}/typing` | `POST` | Reports typing status | Real-time `UserTyping` event |
| `/presence` | `GET` | Checks if a user is online | Based on SignalR connection state |
| `/upload` | `POST` | Uploads a chat attachment | Saves to `wwwroot/uploads/chat` |

### 5. Community Hub (`/api/community-posts`)
A social space for residents to post requests or share info.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/categories` | `GET` | Gets available post categories |
| `/` | `GET` | Lists posts with search/filter/sort |
| `/user/{email}` | `GET` | Gets posts authored by a specific user |
| `/` | `POST` | Creates a new community post |
| `/{id}` | `PUT` | Edits a post (Author only) |
| `/{id}` | `DELETE` | Deletes a post (Author only) |
| `/{id}/comments` | `GET`/`POST` | Manages comments on a post |
| `/{id}/like` | `POST` | Toggles a like on a post |
| `/{id}/report` | `POST` | Reports a post for moderation |
| `/moderation` | `GET` | Gets the queue of reported posts |

---

## 🛠️ Technical Implementation Details

### 📡 Real-time Layer (SignalR)
The `ChatHub` manages WebSocket connections for:
- **Messaging**: Group-based broadcasting (`conversation_{id}`).
- **Presence**: Tracking online/offline status and "last seen" timestamps.
- **Typing Indicators**: Low-latency "is typing..." notifications.

### 🔔 Notification Layer
The `PushNotificationService` integrates with OneSignal to ensure users don't miss:
- New booking requests.
- Booking status changes (Confirmed, Started, Completed).
- New chat messages.

### 💾 Data Layer
- **DbContext**: `SuperbassDbContext` handles the mapping to PostgreSQL.
- **Repositories**: Uses the Repository pattern (e.g., `EfWorkerRepository`) to abstract data access logic from controllers.
- **Migrations**: The application automatically applies pending EF Core migrations on startup to ensure the schema is up-to-date.

### 🔐 Security
- **JWT Validation**: Tokens are validated using a secret key. The system allows SignalR to receive JWTs via the `access_token` query string.
- **Authorization**: Custom logic in controllers (e.g., `IsAuthor`) ensures that only owners can edit or delete their content.
