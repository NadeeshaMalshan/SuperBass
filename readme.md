# workio

> **AI-powered home-service platform connecting trusted local workers with customers in Sri Lanka. 🇱🇰**

**workio** is a modern home-service platform that connects customers with trusted local workers for home, repair, maintenance, and community services.

The platform uses **AI-powered matching with LangGraph** to help customers find suitable workers based on their requirements.

---

## 🚀 Features

* 🏠 Home-service marketplace
* 👷 Local worker discovery
* 🔍 Service and worker search
* 🤖 AI-powered worker matching
* 📍 Location-based services
* 💬 Customer and worker communication
* ⭐ Worker ratings and reviews
* 📋 Job/service requests
* 🇱🇰 Built for the Sri Lankan community

---

## 🧠 AI Matching

workio uses **LangGraph** to build the AI-powered matching workflow.

The AI can analyze:

* Customer requirements
* Service type
* Required skills
* Worker experience
* Location
* Availability
* Job details

The goal is to recommend the most suitable local worker for each customer's request.

```text
Customer Request
       ↓
AI Analysis
       ↓
LangGraph Workflow
       ↓
Worker Matching
       ↓
Recommended Workers
       ↓
Customer
```

---

## 🔄 CI/CD Workflows

workio implements separate CI/CD pipelines for each component to ensure independent testing and deployment:

### Frontend (React/Vite)
- **File**: `.github/workflows/frontend-ci.yml`
- **Triggers**: Changes to `Frontend/`, `package.json`, `package-lock.json`, `vite.config.js`
- **Process**: Dependency installation → Linting → Testing → Production build → Artifact upload

### Backend (.NET API)
- **File**: `.github/workflows/ci.yml` (backend-ci job)
- **Triggers**: Changes to `Backend/` directory
- **Process**: Checkout → .NET setup → Dependency restore → Build → Test

### Mobile App (Flutter/Dart)
- **File**: `.github/workflows/ci.yml` (flutter-ci job)
- **Triggers**: Changes to `App/` directory
- **Process**: Checkout → Java setup → Flutter setup → Dependency install → Code analysis → Web build → Artifact upload

### AI Backend (FastAPI/LangChain)
- **File**: `.github/workflows/ai-backend-ci.yml`
- **Triggers**: Changes to `agent-backend/`, `requirements.txt`, `pyproject.toml`
- **Process**: Checkout → Python setup → Dependency install → Linting → Testing → Health check → Package upload

### MCP Service (Model Context Protocol)
- **File**: `.github/workflows/mcp-ci.yml`
- **Triggers**: Changes to `MCP/`, `requirements.txt`, `pyproject.toml`
- **Process**: Checkout → Python setup → Dependency install → Linting → Testing → Health check → Package upload

---

## 🛠️ Technology Stack

| Technology    | Purpose                         |
| ------------- | ------------------------------- |
| **React**     | Web frontend                    |
| **Flutter**   | Mobile application              |
| **.NET**      | Backend / API                   |
| **FastAPI**   | AI Backend services             |
| **LangGraph** | AI workflow and worker matching |
| **MCP**       | Model Context Protocol service  |
| **Database**  | Application data storage        |

---

## 💻 Web Application

The web application is built with **React** and provides the platform interface for customers and workers.

---

## 📱 Mobile Application

The mobile application is built using **Flutter**, providing a cross-platform experience for Android and iOS.

---

## ⚙️ Backend

The backend is developed using **.NET** and provides the APIs and business logic required by the web and mobile applications.

Responsibilities include:

* User management
* Authentication
* Worker management
* Service management
* Job requests
* Worker matching
* API communication

---

## 🤖 AI System

The AI layer uses **LangGraph** to manage the worker-matching workflow.

```text
React Web App
       │
Flutter App
       │
       ▼
   .NET API
       │
       ▼
 AI / LangGraph
       │
       ▼
Worker Matching
       │
       ▼
Recommended Worker
```

---

## 👁️ Vision

To make finding trusted local workers easier, faster, and smarter for people across Sri Lanka.

### workio

**Trusted local workers. Smarter home services. 🇱🇰**

---

## 🌱 Future Improvements

* AI-powered recommendations
* Worker verification
* Ratings and reviews
* Real-time notifications
* In-app chat
* Location-based worker matching
* Online payments
* Multi-language support
* Job tracking
* Worker availability
* AI-assisted service requests

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Commit your changes
5. Push the branch
6. Create a Pull Request

---

## 📄 License

This project is currently under development.

---

## 🇱🇰 workio

**Connecting Sri Lankan communities with trusted local workers through technology and AI.**