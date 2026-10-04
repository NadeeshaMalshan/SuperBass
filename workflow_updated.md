# Updated Workflow Diagram with 4 AI Agents

Here's the updated Mermaid diagram with 4 AI agents added to the LangGraph workflow:

```mermaid
graph TB
subgraph "LangGraph Workflow"
Entry[Entry Node]
Router{Intent Router}
SearchWorkers[Search Workers Tool]
CreatePost[Create Community Post Tool]
GetBookings[Get User Bookings Tool]
CreateBooking[Create Booking Tool]
SubmitReview[Submit Review Tool]
GetProfile[Get User Profile Tool]
GeneralChat[General Chat LLM]
Formatter[Response Formatter]

% Added 4 AI Agents
WorkerMatcher[Worker Matching Agent]
ServiceRecommender[Service Recommendation Agent]
AutoScheduler[Automated Scheduling Agent]
QualityMonitor[Service Quality Monitor Agent]
end

```
Entry --> Router  
Router -->|find_worker| SearchWorkers  
Router -->|create_post| CreatePost  
Router -->|view_bookings| GetBookings  
Router -->|book_worker| CreateBooking  
Router -->|rate_worker| SubmitReview  
Router -->|profile| GetProfile  
Router -->|general| GeneralChat

% New routes for AI agents
Router -->|match_worker| WorkerMatcher
Router -->|recommend_service| ServiceRecommender
Router -->|optimize_schedule| AutoScheduler
Router -->|monitor_quality| QualityMonitor

SearchWorkers --> Formatter  
CreatePost --> Formatter  
GetBookings --> Formatter  
CreateBooking --> Formatter  
SubmitReview --> Formatter  
GetProfile --> Formatter  
GeneralChat --> Formatter

% Connect AI agents to formatter
WorkerMatcher --> Formatter  
ServiceRecommender --> Formatter  
AutoScheduler --> Formatter  
QualityMonitor --> Formatter

subgraph "MCP Tools"  
    MCPWorkerSearch[search_workers]  
    MCPCreatePost[create_community_post]  
    MCPGetBookings[get_user_bookings]  
    MCPCreateBooking[create_booking]  
    MCPSubmitReview[submit_review]  
    MCPGetProfile[get_user_profile]  
end

SearchWorkers -.-> MCPWorkerSearch  
CreatePost -.-> MCPCreatePost  
GetBookings -.-> MCPGetBookings  
CreateBooking -.-> MCPCreateBooking  
SubmitReview -.-> MCPSubmitReview  
GetProfile -.-> MCPGetProfile

```

## Description of Added AI Agents:

1. **Worker Matching Agent**: Advanced AI that goes beyond basic search to find optimal worker matches based on skills, availability, location, ratings, and historical performance patterns.

2. **Service Recommendation Agent**: Recommends relevant services to users based on their booking history, seasonal needs, location trends, and similar user profiles.

3. **Automated Scheduling Agent**: Optimizes time slots based on worker locations and traffic patterns, and manages scheduling conflicts.

4. **Service Quality Monitor Agent**: Continuously analyzes service quality through review patterns, booking completion rates, and user feedback to automatically flag issues and suggest improvements.

These agents integrate seamlessly into the existing workflow by routing from the Intent Router and feeding their responses to the Response Formatter, maintaining the clean architecture of the original design.