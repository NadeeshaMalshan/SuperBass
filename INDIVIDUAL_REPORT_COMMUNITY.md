# INDIVIDUAL REPORT

## 1. Individual Introduction

### 1.1 Personal Introduction

* **Name:** [Your Name]
* **Student ID:** [Your Student ID]
* **Degree / Program:** [BSc (Hons) in Software Engineering / Computer Science]
* **Role in the Project:** Full-Stack & Agentic AI Developer — Community Component

---

### 1.2 Assigned Component

Responsible for the **Community Management and Community Agentic AI** functionality in **Workio**. This component encompasses:

* **End-to-End Community Post Lifecycle:** Creating, viewing, editing, and soft-deleting posts, classifieds, and emergency maintenance requests.
* **Social Engagement Subsystem:** Comments feed, instant like toggling, and real-time push notification dispatch to authors.
* **Search & Location Discovery:** 21 standardized industry categories with dual-tier Sri Lankan geographical filtering (all 9 provinces and 25 districts).
* **Multi-Platform UI:** Full-featured Web Community Hub (React/Vite) and Cross-Platform Mobile Application (Flutter).
* **MCP (Model Context Protocol) Server Integration:** 7 dedicated JSON-RPC 2.0 community and user tools.
* **Autonomous Community AI Agent:** LangGraph/LangChain specialist agent capable of understanding user service issues, drafting classifieds, sanitizing media, and serving interactive UI cards.

> **Contribution to Workio:**  
> The Community component serves as Workio's social and classified discovery backbone. It empowers residents to broadcast home maintenance issues or seek local neighborhood recommendations, while offering workers immediate job leads in their local areas. Furthermore, its integration into the conversational AI assistant allows users to draft, preview, and publish community posts simply by describing their problem in plain language.

---

# 2. Individual Contribution

### 2.1 Responsibilities

* **Backend & Database Architecture:** Designed and built RESTful endpoints, Entity Framework Core repositories, and database schemas for community posts, nested comments, like counters, and category data.
* **Authorization & Data Security:** Built strict author ownership validation (`IsAuthor`) to protect user posts from unauthorized edits or deletion while handling JWT email claims.
* **Cross-Platform Development:** 
  * **Web (React/Vite):** Developed the interactive Community Hub (`Community.jsx`), custom image gallery modals, and reusable management modules (`MyCommunityPostsManager.jsx`).
  * **Mobile (Flutter):** Built the complete mobile community experience (`community_screen.dart`), tabbed feeds (All Posts vs. My Posts), device image picker, and like/comment dialogues.
* **MCP Tooling:** Designed and exposed 7 JSON-RPC 2.0 tool definitions on the Workio MCP server.
* **Agentic AI & LangGraph Engineering:** Developed the Community Agent node, system prompts, out-of-band context management (`ContextVar`) for image attachments, and UI card builders.
* **Push Notifications:** Wired the notification service to alert authors when their posts receive comments or likes.

---

### 2.2 Features Developed

1. **Community Classifieds Feed & Explorer:**
   * Feed browsing with keyword search, multi-category filtering, province/district filtering, and sorting (Newest, Oldest, Most Liked).
   * Multiple view modes: Grid (Large Card), Compact (Small Card), and Detailed List view.
2. **Post Lifecycle Management (CRUD):**
   * Rich post creation with multi-image attachments (base64 data URLs / remote URLs).
   * In-place modal editing and soft-deletion updating status to `"Removed"`.
   * "My Community Posts" dedicated view inside both Resident and Worker dashboards.
3. **Engagement & Social Interactions:**
   * Nested comment system with immediate feedback.
   * Like toggle counter with state persistence.
   * Automated push notifications alerting authors when peers interact with their posts.
4. **Community AI Specialist Agent:**
   * Autonomous supervisor routing: Evaluates user intent to determine whether to recommend a direct worker or draft a community post.
   * Natural language post generation: Automatically formulates issue-specific titles and structured content.
   * Interactive UI Cards (`DraftPostCard`, `PostDetailCard`, `PostListCard`) rendered directly within the chat widget for one-click publishing.
5. **Standardized Categories & Sri Lanka Geo-filtering:**
   * Support for 21 official service categories (Plumbing, Electrical, Carpentry, AC, etc.).
   * Dual-level administrative filtering across all 9 provinces and 25 districts of Sri Lanka.

---

### 2.3 Technical Implementation

#### 1. Backend / API Implementation (ASP.NET Core & EF Core)
* **Controller (`CommunityPostsController.cs`):**
  * `GET /api/community-posts` — Filtered retrieval (search, category, location, sort).
  * `GET /api/community-posts/{id}` — Single post retrieval.
  * `GET /api/community-posts/user/{email}` — Authored posts for a specific user.
  * `POST /api/community-posts` — Post creation extracting identity from JWT claims or request payload.
  * `PUT /api/community-posts/{id}` & `DELETE /api/community-posts/{id}` — Author-validated modifications.
  * `POST /api/community-posts/{id}/comments` — Appends comments and dispatches background notifications.
  * `POST /api/community-posts/{id}/like` — Toggles like status and increments/decrements count.
  * `GET /api/community-posts/categories` — Retrieves standardized category catalog.
* **Repository (`EfCommunityPostRepository.cs`):** Implemented with Entity Framework Core, optimized LINQ queries with indexed filtering, pagination, and transactional updates.
* **Notification Integration:** Injected `IPushNotificationService` to trigger asynchronous notifications (`community_comment`, `community_like`) to post authors.

#### 2. Model Context Protocol (MCP) Server (`MCP/main.py`)
Exposed 7 standardized JSON-RPC 2.0 tools:
1. `create_community_post` — Creates a post under the authenticated user.
2. `get_community_posts` — Queries posts with category and pagination parameters.
3. `update_community_post` — Modifies post title, content, location, or category with author verification.
4. `delete_community_post` — Soft-deletes posts safely.
5. `get_user_community_posts` — Retrieves posts authored by a specific user email.
6. `get_user_details` — Fetches complete user profiles for authorization and context.
7. `get_service_categories` — Provides the official 21 categories to the LLM.

#### 3. Agentic AI Implementation (LangGraph & LangChain)
* **Node Implementation (`community_agent.py`):** Configured with dynamic system instructions (`COMMUNITY_AGENT_SYSTEM_PROMPT`) passing authenticated user details, location, and role.
* **Token Rate-Limit Guard (`community_tools.py`):** Built recursive `sanitize_payload()` to strip heavy base64 strings and large data URLs before tool responses enter the LLM context, eliminating TPM 429 errors.
* **Out-of-Band Attachments:** Utilized Python `contextvars.ContextVar` (`current_post_images`) to pass real uploaded images straight to the MCP tool without blowing up LLM prompt tokens.
* **Conversational UI Card Generator (`card_builders.py`):** Converts tool output into rich structured card dictionaries (`card_type: "community_draft"`, `"community_detail"`, `"community_list"`).

#### 4. Frontend & Mobile Work
* **Web (React/Vite):**
  * `Community.jsx`: Responsive layout with masonry cards, modal carousels, view mode toggles, and live search.
  * `MyCommunityPostsManager.jsx`: Modular management dashboard mounted in both Resident and Worker profiles.
  * `AiCommunityChat.jsx`: Chat canvas that natively parses and renders interactive agent cards.
* **Mobile (Flutter):**
  * `community_screen.dart`: Tabbed interface (`All Posts` & `My Posts`), image attachment through `image_picker`, district bottom sheets, like animations, and comment bottom sheets.

---

### 2.4 Integration with the Group System

The Community component integrates seamlessly across the platform:
* **Worker Component:** Workers view community classifieds from their dashboard to find immediate local jobs and contact customers.
* **Resident Profile & Auth:** Integrates with JWT authentication to verify author identity, display user profile pictures, and manage posts under profile settings.
* **Supervisor Agent & Multi-Agent Graph:** The Supervisor Agent evaluates intent from natural language prompts; queries regarding general problems or classifieds route directly to the Community Agent node.
* **Unified Push Notification Subsystem:** Connects to the notification drawer, ensuring users receive immediate updates when other members interact with their posts.

---

# 3. Testing and Evidence

### 3.1 Testing Performed

* **API Testing:** Validated CRUD operations, status code handling (200, 201, 400, 403, 404), and query parameter filters using Postman.
* **Database Testing:** Verified EF Core migrations, soft deletion states (`Status = "Removed"`), and foreign key integrity.
* **MCP Server Testing:** Executed automated end-to-end tool validation scripts (`MCP/run_tests.py`) verifying JSON-RPC calls.
* **Agentic AI & Workflow Testing:** Ran automated pytest suites in `agent-backend/tests/test_workflow.py` testing supervisor routing, tool count, title generation, and card formatting.
* **Cross-Device UI Testing:** Tested responsive UI behavior on desktop browsers and mobile screen viewports in Flutter.

---

### 3.2 Test Results

| Test ID | Test Description | Expected Result | Result |
| :--- | :--- | :--- | :---: |
| **TC-COMM-01** | Create community post via API | Post persisted; returns 201 Created with generated Post ID | **Pass** |
| **TC-COMM-02** | Query posts with category & location filter | Only matching posts returned; non-matching filtered out | **Pass** |
| **TC-COMM-03** | Update post with mismatched author identity | Returns 403 Forbidden; post content unchanged | **Pass** |
| **TC-COMM-04** | Soft delete community post | Status changed to "Removed"; excluded from active listings | **Pass** |
| **TC-COMM-05** | Add comment to post | Comment added; push notification dispatched to author | **Pass** |
| **TC-COMM-06** | MCP tool invocation: `create_community_post` | JSON-RPC returns newly created post payload | **Pass** |
| **TC-COMM-07** | Supervisor AI intent routing | User prompt "I have a water leak" triggers community option | **Pass** |
| **TC-COMM-08** | LLM Image Sanitization | Strips base64 data URLs to `[image_attached]`, avoiding TPM 429 | **Pass** |
| **TC-COMM-09** | AI Draft Card Generation | AI produces `DraftPostCard` with editable fields and publish CTA | **Pass** |
| **TC-COMM-10** | Mobile Flutter Feed Loading | Posts load asynchronously with pull-to-refresh and tab switching | **Pass** |

---

### 3.3 Defects and Fixes

1. **Defect:** Multi-turn AI conversations failed with `429 Too Many Requests (TPM Limit)` or `400 Context Length Exceeded` when users uploaded post photos.  
   * **Fix:** Built `sanitize_payload()` to strip raw base64 data URLs from tool responses before returning to the LLM, storing binary images in a scoped Python `ContextVar` (`current_post_images`) executed out-of-band.
2. **Defect:** Authors were blocked from editing or deleting posts due to strict email case sensitivity and differences between OAuth claims and display names.  
   * **Fix:** Implemented a robust `IsAuthor()` normalization helper in `CommunityPostsController.cs` that checks lowercase trimmed emails, user IDs, and username prefixes.
3. **Defect:** AI agent drafted repetitive titles like "Community Service Request" or "Draft Post".  
   * **Fix:** Implemented dynamic keyword extraction (`generate_issue_title()`) that analyzes the user's issue text and service category to create descriptive titles (e.g., "Emergency Plumber for Water Leak").

---

# 4. Development and Collaboration

### 4.1 Git and GitHub Contribution

Development was organized into focused feature branches aligned with component milestones:

* **Branches:**
  * `Community` — Backend REST APIs, EF Core repositories, database migrations, and initial React Community Hub.
  * `community-mobile-app` — Flutter mobile implementation (`community_screen.dart`), tabbed view, image picker, and mobile API integration.
  * `MCP` — Model Context Protocol JSON-RPC 2.0 tools for community operations and automated test runner (`run_tests.py`).
  * `agent-community` — LangGraph community specialist node, prompt engineering, and card builder utilities.
  * `agent-fix` — Payload sanitization to fix TPM 429 errors, issue title generator improvements, and supervisor routing refinements.
* **Pull Requests & Code Reviews:** Authored PRs with detailed descriptions, screenshots, and test coverage summaries before merging into `main`.

---

### 4.2 Team Collaboration

* **Schema Coordination:** Standardized category identifiers and payload models with team members to ensure consistency between Worker Matching, Resident Management, and Community feeds.
* **Multi-Agent State Sharing:** Collaborated with the multi-agent developer to ensure the Supervisor Agent correctly detects community requests and routes context seamlessly.
* **Component Reusability:** Packaged `MyCommunityPostsManager.jsx` as a reusable component, allowing both Resident and Worker portal owners to integrate community post management with zero duplicate code.

---

# 5. Challenges and Solutions

### Challenge 1: LLM Context Token Blowout from Image Attachments
* **Cause:** User-uploaded base64 images generated massive token payloads that quickly exceeded OpenAI's token-per-minute (TPM) limits during multi-turn chats.
* **Solution:** Developed an out-of-band context pipeline using Python's `contextvars.ContextVar` and a recursive `sanitize_payload()` function that replaces image blobs with `[image_attached]` in LLM history while preserving binary payloads for MCP tool calls.
* **Result:** Eliminated token rate-limit crashes completely while retaining multi-image upload functionality.

### Challenge 2: Author Ownership and Identity Reconciliation
* **Cause:** Users could authenticate via different claim structures (direct email, JWT Bearer tokens, or display names), causing legitimate authors to receive 403 Forbidden errors when attempting to edit their posts.
* **Solution:** Created the `IsAuthor()` evaluation engine in `CommunityPostsController.cs` that performs case-insensitive normalization across email claims, user IDs, and username prefixes.
* **Result:** Guaranteed secure, tamper-proof post management without falsely locking out authenticated authors.

### Challenge 3: Closing the Gap Between Conversational AI and Actionable UI
* **Cause:** Text-only AI responses forced users to manually re-type data into web forms to publish a post.
* **Solution:** Built custom structured card builders (`build_community_card`) that transform agent intent into interactive React components (`DraftPostCard`, `PostDetailCard`).
* **Result:** Users can review pre-filled drafts, make inline edits, upload photos, and publish with a single click inside the chat widget.

---

# 6. Learning and Reflection

### 6.1 Technical Learning

* **ASP.NET Core 8 & EF Core:** Gained deep knowledge of repository patterns, LINQ query optimizations, database migrations, and claims-based JWT authorization.
* **Model Context Protocol (MCP):** Learned to design and implement JSON-RPC 2.0 tool servers to safely bridge enterprise APIs with LLM agents.
* **LangGraph & LangChain:** Mastered graph-based multi-agent orchestration, state schema design, conditional routing, and structured Pydantic tool outputs.
* **Cross-Platform Development (React + Flutter):** Built production-grade web interfaces using React/Vite and native-feeling mobile applications using Flutter.

### 6.2 Software Engineering Learning

* **Decoupled Architecture:** Experienced the architectural advantage of decoupling the AI orchestration layer, MCP server layer, and core REST backend.
* **API Contract Discipline:** Understood the necessity of freezing schema definitions early to enable parallel development across mobile, web, and AI agents.
* **Defensive Engineering:** Learned the importance of token sanitization, payload limits, and graceful offline fallbacks when building production AI systems.

### 6.3 Personal Reflection

* **What I Improved:** My full-stack confidence grew significantly by building and connecting every layer of a feature — from database tables to mobile screens and conversational AI agents.
* **What I Found Difficult:** Handling asynchronous token limits and managing multi-turn agent state across complex conversational turns.
* **How My Engineering Approach Changed:** I transitioned from writing conventional forms to designing intelligent, agent-augmented user experiences where the system proactively assists the user.

---

# 7. AI Usage

### 7.1 AI Tools and Usage

| AI Tool / Agent | Purpose / Work |
| :--- | :--- |
| **ChatGPT** | Used for research, system architecture brainstorming, drafting initial designs, and generating UI asset concepts/mock images. |
| **Antigravity** | Used as the primary agentic pair programmer for developing full-stack code, writing ASP.NET backend APIs, implementing LangGraph nodes and MCP tools, running automated tests, and diagnosing/fixing codebase defects across branches. |

### 7.2 Human Verification

AI-generated suggestions, code snippets, and architectural suggestions were not used without rigorous human verification. Every endpoint, MCP tool schema, and agent state transition was reviewed, tested against automated test suites (`test_workflow.py` and `run_tests.py`), and modified to adhere to project coding guidelines and security constraints. Final architectural and implementation decisions were entirely performed and validated by me.

---

# 8. Individual Conclusion

Through my work on the Community Component of Workio, I developed an end-to-end social classifieds platform integrating a .NET Core REST API, EF Core database layer, modern React frontend, Flutter mobile app, and an intelligent LangGraph-powered Community Agent. 

This component fulfills a core pillar of Workio by enabling residents to broadcast service requests, exchange local recommendations, and receive direct worker proposals. By coupling classical full-stack engineering with cutting-edge Agentic AI and MCP tooling, I created a responsive and future-ready solution that bridges conversational AI with intuitive user interaction.
