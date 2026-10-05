```mermaid
graph TD
    %% External Users
    subgraph ExternalUsers
        Homeowner[Homeowner/User]
        Worker[Service Worker]
    end
    
    %% Mobile Application
    subgraph MobileApp[Flutter Mobile App]
        MainDart[main.dart]
        Screens[Screens]
        Services[Services]
        Widgets[Widgets]
        Models[Models]
        
        MainDart --> Screens
        MainDart --> Services
        MainDart --> Widgets
        MainDart --> Models
    end
    
    %% Web Frontend
    subgraph WebFrontend[React Web Frontend]
        AppJSX[App.jsx]
        Components[Components]
        Pages[Pages]
        Services[Services]
        Assets[Assets]
        
        AppJSX --> Components
        AppJSX --> Pages
        AppJSX --> Services
        AppJSX --> Assets
    end
    
    %% Backend API
    subgraph BackendAPI[.NET 8 Backend API]
        Controllers[Controllers]
        Models[Models]
        Services[Services]
        Hubs[Hubs]
        Program[Program.cs]
        
        Controllers --> Models
        Controllers --> Services
        Services --> Models
        Hubs --> Services
    end
    
    %% AI Backend
    subgraph AIBackend[AI Backend (Python/LangGraph)]
        Supervisor[Supervisor Agent]
        WorkerFindAgent[Worker Find Agent]
        BookingAgent[Booking Agent]
        CommunityAgent[Community Agent]
        ReviewSupportAgent[Review & Support Agent]
        MCPClient[MCP Client Tools]
        Workflow[LangGraph Workflow]
        KnowledgeBase[Knowledge Base]
        
        Supervisor --> WorkerFindAgent
        Supervisor --> BookingAgent
        Supervisor --> CommunityAgent
        Supervisor --> ReviewSupportAgent
        WorkerFindAgent --> MCPClient
        BookingAgent --> MCPClient
        CommunityAgent --> MCPClient
        ReviewSupportAgent --> MCPClient
        Supervisor --> Workflow
        Workflow --> KnowledgeBase
    end
    
    %% Database
    subgraph Database[Database (SQL Server/EF Core)]
        ResidentTable[Residents]
        WorkerTable[Workers]
        BookingTable[Bookings]
        ConversationTable[Conversations]
        ChatMessageTable[Chat Messages]
        CommunityPostTable[Community Posts]
        CommunicationTable[Communications/Notifications]
    end
    
    %% WebSocket/SignalR
    subgraph Realtime[Real-time Communication]
        SignalRHub[SignalR Hub]
        MobileWS[Mobile App WS Connection]
        WebWS[Web Frontend WS Connection]
    end
    
    %% Connections
    %% Mobile App connections
    Homeowner -->|Uses| MobileApp
    Worker -->|Uses| MobileApp
    MobileApp -->|REST API| BackendAPI
    MobileApp -->|WebSocket| SignalRHub
    
    %% Web Frontend connections
    Homeowner -->|Uses| WebFrontend
    Worker -->|Uses| WebFrontend
    WebFrontend -->|REST API| BackendAPI
    WebFrontend -->|WebSocket| SignalRHub
    
    %% Backend API connections
    BackendAPI -->|CRUD Operations| Database
    BackendAPI -->|AI Requests| AIBackend
    SignalRHub -->|Real-time Updates| MobileApp
    SignalRHub -->|Real-time Updates| WebFrontend
    
    %% AI Backend connections
    AIBackend -->|Read/Write| Database
    AIBackend -->|External APIs| MCPClient
    MCPClient -->|External Services| ExternalAPIs[External APIs (Google Maps, etc.)]
    
    %% Styling
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
    classDef mobile fill:#bbf,stroke:#333,stroke-width:2px;
    classDef web fill:#bfb,stroke:#333,stroke-width:2px;
    classDef backend fill:#fbb,stroke:#333,stroke-width:2px;
    classDef ai fill:#ffb,stroke:#333,stroke-width:2px;
    classDef db fill:#bfb,stroke:#333,stroke-width:2px;
    classDef realtime fill:#fbf,stroke:#333,stroke-width:2px;
    
    class Homeowner,Worker external;
    class MainDart,Screens,Services,Widgets,Models mobile;
    class AppJSX,Components,Pages,Services,Assets web;
    class Controllers,Models,Services,Hubs,Program backend;
    class Supervisor,WorkerFindAgent,BookingAgent,CommunityAgent,ReviewSupportAgent,MCPClient,Workflow,KnowledgeBase ai;
    class ResidentTable,WorkerTable,BookingTable,ConversationTable,ChatMessageTable,CommunityPostTable,CommunicationTable db;
    class SignalRHub,MobileWS,WebWS realtime;
```
```