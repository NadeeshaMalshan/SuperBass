# superබාස් — Landing Page Information Architecture (`landing.md`)

> **Platform:** superබාස් (SuperBass) — AI-Powered Community Home Service Platform  
> **Target Audience:** Homeowners & Residents, Professional Service Providers (Baas / Pros)  
> **Design Framework:** Google Material Design 3 (M3) Web Specification  

---

## 1. Header & Navigation

### 1.1 Brand Identity
- **Logo:** `Super බාස්` Logo with high-contrast badge
- **Logo Asset:** `/iconWithText-cropped.png`
- **Drop Shadow:** `rgba(245, 158, 11, 0.25)`

### 1.2 Navigation Links
| Navigation Item | Target Route / Action | Description & Visual Details |
| :--- | :--- | :--- |
| **Services** | `/find` | Direct link to explore and filter verified service craftsmen by location, skill, and rating. |
| **Community** | `/community` | Community hub for home maintenance discussions, tips, and neighborhood help requests. |
| **AI Assistant** | `/ai-chat` | Highlighted with ✨ amber sparkle icon (`#f59e0b`), direct access to SuperBass AI Home Diagnostician. |
| **How it Works** | `#how-it-works` | Explanatory section on requesting, confirming, and managing home repair services. |
| **For Baas / Pros** | `/join` | Onboarding portal for craftsmen and verified service technicians to register their profile. |

### 1.3 Navigation Actions (Header CTA)
- **Guest State (Not Logged In):**
  - **Button:** `<md-filled-button class="header-cta-btn">Get Started</md-filled-button>`
  - **Route:** Navigates to `/find`
- **Authenticated State (Logged In):**
  - **Button:** `<md-filled-button class="header-cta-btn">Find Workers</md-filled-button>`
  - **User Profile Menu:** Material 3 `<UserMenu />` component (Avatar, Role switcher, Profile & Bookings navigation, Sign out).

---

## 2. Hero Section — Uber-Style Interactive Service Request Clone

### 2.1 Top Sub-Navigation Bar
- **Left Category Title:** `Hire a Baas`
- **Right Quick Links:** `Request a Baas` (Active), `Reserve in advance`, `See price guide`, `Explore all skills`, `Community tips`.

### 2.2 Left Column: Interactive Request & Worker Search Module
- **Main Headline:**
  > **"Request a Baas"**
- **Time / Schedule Pill Toggle:**
  - `🕒 Service now ▾` (Toggles between immediate request and scheduling for later).
- **Connected Route & Location Box (Uber Connected Style):**
  - **Location Row:** Circle indicator (`●`), auto-fill input (`Your location e.g. Ratnapura, Colombo...`), and Geolocation GPS detector button (`near_me`).
  - **Vertical Connector Bar:** Solid 2px connecting black line.
  - **Service Row:** Square indicator (`■`), Service/Skill input (`Service needed e.g. Electrician, Plumber, Mason...`) with searchable suggestions datalist.
- **Primary CTA Button:**
  - **"See available workers"** (Navigates directly to `/find` with prefilled query and location filters).
- **Secondary Action:**
  - **"Ask SuperBass AI"** button for instant AI-assisted troubleshooting.

### 2.3 Right Column: Hero Artwork
- **Image Card:** Clean rounded artwork container (`border-radius: 16px`, `box-shadow: 0 10px 30px rgba(0,0,0,0.06)`).
- **Artwork Asset:** `/hero/hero1.png` (Craftsman working at sunset).

---

## 3. Services Directory — 3x3 Minimalist Grid

### 3.1 Overview Statement
> *"Find reliable local workers for home repairs, maintenance, and everyday services - all in one simple platform."*

### 3.2 Service Categories
| Category | Icon Class | Purpose & Typical Service Needs |
| :--- | :--- | :--- |
| **1. Electrician** | `fa-solid fa-bolt` | Wiring repairs, short circuits, switchboard installations, light fixtures, generator hookups. |
| **2. Plumber** | `fa-solid fa-faucet-drip` | Pipe leak fixes, tap & bathroom fitting repairs, water motor troubleshooting, drainage cleaning. |
| **3. Carpenter** | `fa-solid fa-hammer` | Furniture repair, door & window hinges, lock replacements, custom wooden cabinetry. |
| **4. Mason** | `fa-solid fa-trowel-bricks` | Wall plastering, tile laying, brickwork repair, structural cement patchings. |
| **5. Painter** | `fa-solid fa-paint-roller` | Interior/exterior wall painting, waterproofing coats, wood polish, touch-up finishes. |
| **6. AC Repair** | `fa-solid fa-snowflake` | AC servicing, gas filling, thermostat repair, cooling unit installations. |
| **7. Roofing** | `fa-solid fa-house-chimney` | Tile replacement, roof leak waterproofing, gutter repair, roof framing maintenance. |
| **8. Appliance Repair** | `fa-solid fa-screwdriver-wrench` | Washing machines, refrigerators, microwave ovens, water heaters, kitchen appliances. |
| **9. CCTV & Security** | `fa-solid fa-video` | Security camera installations, DVR setups, smart doorbells, home surveillance systems. |

*Each item features a custom M3 sunny polygon framing shape (`.sunny-shape`) with smooth hover micro-animations.*

---

## 4. Community Showcase Section — Neighborhood Network
 
### 4.1 Section Title & Key Message
- **Badge:** `👥 Neighborhood Network`
- **Headline:**
  > **"Connect with your local community & find trusted help"**
- **Description:**
  > *"Share recommendations, ask neighborhood home repair questions, post free classified ads for tools & leftover materials, and discover trusted craftsmen recommended by local residents."*

### 4.2 Highlights & Capabilities
- **Feature Highlights:**
  - ✅ Free classified ads & local home service requests
  - ✅ Direct recommendations & reviews from neighbors
  - ✅ Community discussions with verified home pros
- **Primary CTA Button:**
  - **"Explore Community"** with `arrow_forward` icon (Routes directly to `/community`).

### 4.3 Visual Showcase
- **Layout:** Responsive 2-column layout mirroring Hero aesthetics.
- **Artwork Asset:** `/hero/hero2.png` (SuperBass Craftsman consulting with a neighborhood family at sunset).
- **Container Styling:** 16px border-radius, clean border outline, and soft elevation shadow (`box-shadow: 0 12px 36px rgba(0,0,0,0.08)`).

---

## 5. SuperBass AI Feature Section

### 5.1 Section Title & CTA
- **Title:**
  > **"Now, you can manage your work with SuperBass AI"**
- **Action Button:**
  - Label: `SuperBass AI`
  - Interactive preview image upload trigger.

### 5.2 Visuals
- **Background Blobs:** Custom SVG bun shape in `#FDC101`.
- **Mockup:** Mobile phone mockup (`/hero/mockup.png`) showcasing AI-assisted diagnostic capabilities.

---

## 6. Floating AI Assistant Widget (`AiAssistantWidget.jsx`)

- **Placement:** Floating bottom-right widget across the application.
- **Capabilities:**
  1. **Instant Home Issue Diagnosis:** Chat with Gemini AI to diagnose plumbing leaks, electrical tripping, masonry cracks, etc.
  2. **Image Inspection:** Snap or upload a photo of broken equipment/pipes for AI analysis.
  3. **Direct Worker Matching:** AI recommends verified local Baas and links to their booking profiles.

---

## 7. Color Tokens & Brand System Summary

- **Primary Brand Yellow (Resident):** `#FDC101`
- **Amber Glow & Dark Hover:** `#d97706` / `#f59e0b`
- **High Contrast Text:** `#0f172a` / `#111827`
- **Craftsman Royal Blue (Worker Mode):** `#2563EB`
- **Neutral Container Backgrounds:** `#f8fafc` / `#f1f5f9`
