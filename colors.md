# SuperBass Design System — Color Palette & Tokens Guide (`colors.md`)

> **Platform:** superබාස් — AI-Powered Community Home Service Platform  
> **Design Standard:** Google Material Design 3 (M3) Web Specification  
> **Theming Model:** Dual Role-Based System (Resident / Default vs. Worker)

---

## 1. Role-Based Dual Theme Architecture

SuperBass uses a dual-accent design system depending on the active user role:
- **Resident (Default Customer)**: Warm Golden Amber / Honey Yellow (`#FDC101` / `#f59e0b`) representing community warmth, optimism, and hospitality.
- **Worker (Craftsman / Pro)**: Deep Craftsman Royal Blue (`#2563EB` / `#0b57d0`) representing reliability, professional expertise, and verified trust.

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         RESIDENT THEME          │       │          WORKER THEME           │
│           (Default)             │       │      (body.worker-theme)        │
│   Primary Accent: #FDC101       │       │   Primary Accent: #2563EB       │
│   Dark Contrast Text: #18181b   │       │   Light Contrast Text: #ffffff  │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

---

## 2. Primary Brand Color Palettes

### 2.1. Resident (Brand Yellow / Amber Palette)

| Token / Variable | Hex Value | RGB | Visual Preview | Usage Description |
| :--- | :--- | :--- | :--- | :--- |
| `--brand-yellow` / `--md-sys-color-primary` | `#FDC101` | `rgb(253, 193, 1)` | 🟡 Brand Yellow | Hero CTA buttons, primary resident actions, logo accent |
| `--brand-yellow-hover` | `#d97706` | `rgb(217, 119, 6)` | 🟠 Amber Dark | Button hover states, active badges, resident verified checkmarks |
| `--brand-yellow-light` | `#fffbeb` | `rgb(255, 251, 235)` | ⚪ Warm Sand | Chip backgrounds, subtle highlighted container tints |
| `--brand-yellow-glow` | `rgba(245, 158, 11, 0.28)` | — | ✨ Amber Glow | Soft button drop-shadows & elevation halos |
| `--md-sys-color-primary-container` | `#fef3c7` | `rgb(254, 243, 199)` | 🌕 Tonal Container | Selected filter chips, active navigation drawer items |
| `--md-sys-color-on-primary-container` | `#78350f` | `rgb(120, 53, 15)` | 🟤 Deep Amber | Text and icons inside amber/yellow containers |
| `--md-sys-color-on-primary` | `#18181b` / `#111827` | `rgb(24, 24, 27)` | ⚫ High Contrast Charcoal | Text on top of filled primary yellow buttons |

### 2.2. Worker (Craftsman Blue Palette)

| Token / Variable | Hex Value | RGB | Visual Preview | Usage Description |
| :--- | :--- | :--- | :--- | :--- |
| `body.worker-theme --md-sys-color-primary` | `#2563EB` | `rgb(37, 99, 235)` | 🔵 Primary Blue | Primary buttons, active tabs, craftsman CTAs |
| `--brand-yellow-hover` (Worker override) | `#1d4ed8` | `rgb(29, 78, 216)` | 🔷 Deep Blue | Button hover states, worker active elements |
| `body.worker-theme --md-sys-color-primary-container` | `#dbeafe` | `rgb(219, 234, 254)` | 🧊 Soft Ice Blue | Worker drawer selected state, notification containers |
| `body.worker-theme --md-sys-color-on-primary-container` | `#1e40af` | `rgb(30, 64, 175)` | 🌌 Midnight Blue | Text and icons inside blue tonal containers |
| `body.worker-theme --md-sys-color-on-primary` | `#ffffff` | `rgb(255, 255, 255)` | ⚪ Pure White | Text and icons on top of blue filled buttons |

---

## 3. Surface & Neutral System Tokens (Light Mode)

SuperBass uses Material Design 3 surface containers to provide depth and structure without harsh borders.

| Token | Hex Value | RGB | Typical Purpose |
| :--- | :--- | :--- | :--- |
| `--md-sys-color-surface` | `#ffffff` | `rgb(255, 255, 255)` | Main page background, card surfaces |
| `--md-sys-color-surface-container-lowest` | `#ffffff` | `rgb(255, 255, 255)` | Recessed worker cards, chat list cards |
| `--md-sys-color-surface-container-low` | `#f8fafc` | `rgb(248, 250, 252)` | Search dropdown headers, card hover states |
| `--md-sys-color-surface-container` | `#f1f5f9` | `rgb(241, 245, 249)` | Metadata chips, location tags, inactive filters |
| `--md-sys-color-surface-container-high` | `#ffffff` / `#eceef4` | — | Floating search popups, modals, dialogs |
| `--md-sys-color-outline` | `#cbd5e1` | `rgb(203, 213, 225)` | Input field outlines, button borders |
| `--md-sys-color-outline-variant` | `#e2e8f0` | `rgb(226, 232, 240)` | Card borders, subtle divider lines |
| `--md-sys-color-on-surface` | `#0f172a` | `rgb(15, 23, 42)` | High-contrast headings, worker names, body text |
| `--md-sys-color-on-surface-variant` | `#64748b` | `rgb(100, 116, 139)` | Subtitles, timestamps, keyboard hints, secondary labels |

---

## 4. Semantic Status & Functional Colors

### 4.1. Success / Availability (Craftsman Online / Job Completed)
- **Primary Green**: `#16a34a` (Green dot indicator, "Available" text)
- **Container Tonal**: `#f0fdf4` (Tonal background for success badges)
- **Border Outline**: `#bbf7d0` (Soft border for availability tags)
- **Pulse Shadow**: `rgba(22, 163, 74, 0.4)` (Live pulsing green halo)

### 4.2. Warning / Rating / Pending Approval
- **Star Rating Gold**: `#f59e0b` (Solid star icons)
- **Rating Text**: `#b45309` (Readable dark amber text)
- **Rating Container**: `#fffbeb` (Light amber backdrop)
- **Rating Border**: `#fef3c7` (Subtle container border)

### 4.3. Danger / Error / Offline / Destructive
- **Error Red**: `#ef4444` / `#dc2626` (Delete actions, urgent errors, cancel buttons)
- **Error Container**: `#fee2e2` (Alert boxes, validation banners)
- **Error Text**: `#991b1b` (High contrast error labels)
- **Offline / Busy Slate**: `#94a3b8` (Gray status dot, inactive timestamps)

---

## 5. Gradients & Visual Effects

### 5.1. M3 Profile Avatar Fallback Gradient
Used across `/find` cards, `/chats` list items, message bubbles, and navbar search dropdowns for initial-letter fallback avatars:
```css
background: linear-gradient(135deg, #0b57d0 0%, #0842a0 100%);
color: #ffffff;
box-shadow: 0 4px 12px rgba(11, 87, 208, 0.2);
```

### 5.2. Hero Page Ambient Radiance (Resident)
```css
background: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0) 50%),
            radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0) 40%);
```

### 5.3. Gemini AI Sparkle Gradient
Used for the AI Assistant navbar icon and AI smart discovery features:
```css
background: linear-gradient(135deg, #4285F4 0%, #9B72CB 35%, #D96570 70%, #F4B400 100%);
```

---

## 6. Component-Level Color Specifications

### 6.1. Search Dropdown Result Cards (`.m3-navbar-worker-card`)
- **Card Background**: `#ffffff`
- **Card Border**: `#e2e8f0` (Hover: `#fde68a` for Resident, `#cbd5e1` for Worker)
- **Worker Name**: `#0f172a` (DM Sans, 700 weight)
- **Verified Badge**: `#d97706` (Resident) / `#2563eb` (Worker)
- **Rating Chip**: `#b45309` text, `#f59e0b` star (No border, transparent BG)
- **Location Chip**: `#64748b` text and pin (No border, transparent BG)
- **Available Chip**: `#16a34a` text, `#16a34a` pulse dot (No border, transparent BG)
- **Chat Button (`<md-filled-button>`)**:
  - **Resident**: Container `#FDC101`, Label `#111827`, Hover `#d97706`
  - **Worker**: Container `#2563EB`, Label `#ffffff`, Hover `#1d4ed8`
- **Profile Button (`<md-outlined-button>`)**:
  - Outline `#cbd5e1`, Label `#334155`, Hover Outline `#94a3b8`

### 6.2. Chat Messages Stream (`.chats-bubble`)
- **Outgoing (Resident Bubble)**:
  - Background: `#FDC101` (or `#eff6ff` in worker mode)
  - Text: `#18181b`
- **Incoming (Worker Bubble)**:
  - Background: `#f1f5f9`
  - Text: `#0f172a`
- **Read Receipts (`fa-check-double`)**:
  - Unread / Delivered: `#94a3b8` (Gray)
  - Read: `#0284c7` (Double Blue Checkmarks)

---

## 7. Quick Copy-Paste CSS Classes & Variables

```css
/* Resident Yellow Accents */
--brand-yellow: #FDC101;
--brand-yellow-hover: #d97706;
--brand-yellow-light: #fffbeb;

/* Worker Blue Accents */
--brand-blue: #2563EB;
--brand-blue-hover: #1d4ed8;
--brand-blue-light: #eff6ff;

/* Semantic Feedback */
--color-success: #16a34a;
--color-rating: #f59e0b;
--color-error: #ef4444;
--color-neutral-muted: #64748b;
```
