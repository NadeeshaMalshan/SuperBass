# Workio Design System — Color Palette & Tokens Guide (`colors.md`)

> **Platform:** Workio — AI-Powered Community Home Service Platform  
> **Design Standard:** Modern High-Contrast Monochrome (Pitch Black, Pure White & Sleek Grays)  
> **Aesthetic Inspiration:** Uber & Apple Clean Minimalist Design Language  
> **Scope:** Entire Project & Universal Component System

---

## 1. Project-Wide Monochrome Design System Architecture

Workio has transitioned across the entire project to a **Unified High-Contrast Black & White Design System** inspired by the Community showcase experience. 

This design system replaces saturated dual-color accents with a timeless, high-contrast, typographic-first aesthetic:
- **Pitch Black (`#000000`)**: Anchors primary CTAs, active states, key headings, hero banners, and high-emphasis pills.
- **Pure White (`#ffffff`)**: Provides crisp surface backgrounds, elevated card containers, and pristine text contrast on dark backgrounds.
- **Curated Grays (`#f7f7f7` to `#1f1f1f`)**: Delivers subtle surface hierarchy, soft rounded inputs, neutral category badges, and smooth dividers without harsh visual noise.
- **Selective Semantic Accents**: Crisp functional colors (`#10b981` emerald for availability/success, `#ef4444` red for likes/delete, `#f59e0b` for ratings) are preserved exclusively for status feedback.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Workio UNIFIED BLACK & WHITE DESIGN SYSTEM              │
│                                                                         │
│   Primary Accent: #000000 (Pitch Black)      Canvas BG: #f7f7f7         │
│   Contrast Surface: #ffffff (Pure White)     Hero BG:   #000000         │
│   Neutral Gray:     #eeeeee / #f6f6f6        Borders:   #e5e5e5         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Palette Tokens & Values

### 2.1. Primary Monochromatic Tokens

| Token / CSS Variable | Hex Value | RGB | Visual Preview | Usage Description |
| :--- | :--- | :--- | :--- | :--- |
| `--brand-black` / `--md-sys-color-primary` | `#000000` | `rgb(0, 0, 0)` | ⚫ Pitch Black | Primary CTA buttons, active tabs, hero banners, high-contrast badges |
| `--brand-black-hover` | `#262626` | `rgb(38, 38, 38)` | ⬛ Charcoal Black | Button hover states, active sidebar focus, elevated dark surfaces |
| `--brand-white` | `#ffffff` | `rgb(255, 255, 255)` | ⚪ Pure White | Card surfaces, modal sheets, hero white pill buttons, text on dark |
| `--brand-white-hover` | `#f1f1f1` | `rgb(241, 241, 241)` | ◻️ Off-White | Hero button hover, light interactive element hover states |
| `--surface-canvas` | `#f7f7f7` | `rgb(247, 247, 247)` | ◽ Canvas Gray | Main application background, feed layout background |
| `--surface-secondary` | `#f6f6f6` | `rgb(246, 246, 246)` | ◽ Soft Gray | Search bars, input field backgrounds, thumbnail media placeholders |
| `--surface-tertiary` | `#eeeeee` | `rgb(238, 238, 238)` | ◽ Muted Gray | Inactive category chips, secondary pill buttons, pagination borders |

---

### 2.2. Neutral Borders & Structural Tokens

| Token | Hex Value | RGB | Typical Purpose |
| :--- | :--- | :--- | :--- |
| `--border-subtle` | `#eeeeee` | `rgb(238, 238, 238)` | Card footers, divider lines, modal separators |
| `--border-default` | `#e5e5e5` | `rgb(229, 229, 229)` | Card borders, sidebar borders, search input outlines |
| `--border-hover` | `#b5b5b5` | `rgb(181, 181, 181)` | Hover state on post cards & worker cards |
| `--border-dark-hero` | `#1f1f1f` / `#282828` | `rgb(31, 31, 31)` | Hero banner bottom border, dark artwork container border |
| `--border-focus` | `#000000` | `rgb(0, 0, 0)` | Active input field focus ring (`box-shadow: 0 0 0 1px #000000`) |

---

### 2.3. Typography Hierarchy & Text Contrast Tokens

| Token | Hex Value | RGB | Usage Description |
| :--- | :--- | :--- | :--- |
| `--text-primary` | `#000000` | `rgb(0, 0, 0)` | High-contrast titles, card headings, author names, button labels |
| `--text-primary-on-dark` | `#ffffff` | `rgb(255, 255, 255)` | Hero showcase heading, white button text on black container |
| `--text-secondary` | `#545454` / `#666666` | `rgb(84, 84, 84)` | Post descriptions, subheadings, category icons, modal subtext |
| `--text-muted` | `#757575` / `#8c8c8c` | `rgb(117, 117, 117)` | Timestamps, counter values, input placeholders, overline metadata |
| `--text-on-black-muted` | `#a3a3a3` | `rgb(163, 163, 163)` | Hero description text, dark banner overline text |

---

## 3. Semantic Status & Functional Colors

To maintain usability and accessibility, status feedback uses restrained, modern semantic highlights:

| Status | Color Name | Hex | Container BG | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Success / Online** | Emerald Green | `#10b981` / `#16a34a` | `#f0fdf4` | Online live pulse, available badges, upload success counter |
| **Favorite / Urgent** | Crimson Red | `#ef4444` | `#fee2e2` | Post like heart (hover/active), delete buttons, destructive modal actions |
| **Rating / Verification**| Amber Gold | `#f59e0b` | `#fffbeb` | Star ratings, verified worker badges, review score stars |
| **Notice / Information**| Deep Slate | `#0284c7` | `#f0f9ff` | Chat double-check read receipts, system notifications |

---

## 4. Universal Component Specifications

### 4.1. Buttons & CTA System (Pill Geometry — `border-radius: 9999px`)

#### A. Primary Black Action Button (`.uber-btn-primary` / `.uber-compose-btn`)
- **Background**: `#000000`
- **Text Color**: `#ffffff`
- **Border**: `1.5px solid #000000`
- **Hover**: Background `#262626`, Border `#262626`, `transform: translateY(-1px)`, Shadow `0 4px 14px rgba(0, 0, 0, 0.2)`
- **Active**: `transform: translateY(0)`

#### B. Secondary Neutral Button (`.uber-btn-secondary`)
- **Background**: `#eeeeee`
- **Text Color**: `#000000`
- **Border**: `1.5px solid #eeeeee`
- **Hover**: Background `#e2e2e2`, Border `#e2e2e2`

#### C. Outlined High-Contrast Button (`.uber-btn-outline`)
- **Background**: `#ffffff`
- **Text Color**: `#000000`
- **Border**: `1.5px solid #000000`
- **Hover**: Background `#f3f3f3`, `transform: translateY(-1px)`

#### D. Hero Inverted White Button (`.community-hero-primary-btn`)
- **Background**: `#ffffff`
- **Text Color**: `#000000`
- **Border**: `none`
- **Hover**: Background `#f1f1f1`, `transform: translateY(-2px)`, Shadow `0 8px 24px rgba(255, 255, 255, 0.22)`

#### E. Hero Ghost White Button (`.community-hero-secondary-btn`)
- **Background**: `transparent`
- **Text Color**: `#ffffff`
- **Border**: `1.5px solid #444444`
- **Hover**: Background `rgba(255, 255, 255, 0.1)`, Border `#ffffff`, `transform: translateY(-2px)`

---

### 4.2. Cards, Feed Items & Grids (`.uber-post-card` / `.uber-search-card`)
- **Surface**: `#ffffff`
- **Border**: `1px solid #e5e5e5`
- **Border Radius**: `16px` (or `20px` for hero artworks)
- **Hover Transition**: `transform: translateY(-3px)`, Border `#b5b5b5`, Shadow `0 12px 28px rgba(0, 0, 0, 0.08)`
- **Media Containers**: `#f6f6f6` with `border-radius: 12px`
- **Category Pill Badges**: `#f3f3f3` background, `#000000` text, font weight `600`, radius `9999px`

---

### 4.3. Inputs, Select Dropdowns & Search Bars
- **Background**: `#f6f6f6`
- **Border**: `1.5px solid #e5e5e5`
- **Border Radius**: `10px` (inputs/selects) or `9999px` (search pills)
- **Placeholder**: `#8c8c8c`
- **Focus State**: Background `#ffffff`, Border `#000000`, `box-shadow: 0 0 0 1px #000000`

---

### 4.4. Dialogs, Modals & Sheets
- **Backdrop Overlay**: `rgba(0, 0, 0, 0.65)` with `backdrop-filter: blur(4px)`
- **Modal Window**: `#ffffff` background, `20px` border-radius, `border: 1px solid #e5e5e5`
- **Drop Shadow**: `0 25px 50px -12px rgba(0, 0, 0, 0.35)`
- **Header & Footer Dividers**: `1px solid #eeeeee`
- **Close Button**: `36px` circle, background `#f3f3f3`, hover `#e2e2e2`

---

### 4.5. Pagination & Navigation Switchers
- **Pagination Inactive Button**: `#ffffff` background, `#e5e5e5` border, `#000000` text
- **Pagination Active Button**: `#000000` background, `#ffffff` text, Shadow `0 2px 8px rgba(0, 0, 0, 0.18)`
- **View Mode Switcher Group**: Pill container `#f6f6f6` with `1px solid #e5e5e5`

---

### 4.6. Loading Spinners & Progress Indicators
- **Spinner Background Ring**: `#eeeeee` (3.5px solid)
- **Spinner Active Stroke**: `#000000` (Pitch Black)
- **Spinner Box**: `#ffffff` background with `#e5e5e5` border

---

## 5. Ready-to-Use CSS Tokens & Utility Guide

Copy and paste these tokens directly into your stylesheet (`index.css` or component files):

```css
:root {
  /* Pitch Black & Pure White Core Tokens */
  --brand-black: #000000;
  --brand-black-hover: #262626;
  --brand-black-active: #1a1a1a;
  --brand-white: #ffffff;
  --brand-white-hover: #f1f1f1;

  /* Surfaces & Canvas */
  --surface-canvas: #f7f7f7;
  --surface-card: #ffffff;
  --surface-input: #f6f6f6;
  --surface-pill: #f3f3f3;
  --surface-muted: #eeeeee;
  --surface-dark-card: #121212;

  /* Borders & Dividers */
  --border-subtle: #eeeeee;
  --border-default: #e5e5e5;
  --border-hover: #b5b5b5;
  --border-focus: #000000;
  --border-dark: #1f1f1f;

  /* Text & Contrast */
  --text-primary: #000000;
  --text-primary-on-dark: #ffffff;
  --text-secondary: #545454;
  --text-muted: #757575;
  --text-placeholder: #8c8c8c;
  --text-on-dark-muted: #a3a3a3;

  /* Semantic Feedback */
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-rating: #f59e0b;
  --color-info: #0284c7;

  /* Material Design 3 Color Mappings */
  --md-sys-color-primary: #000000;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eeeeee;
  --md-sys-color-on-primary-container: #000000;
  --md-sys-color-surface: #ffffff;
  --md-sys-color-on-surface: #000000;
  --md-sys-color-surface-variant: #f7f7f7;
  --md-sys-color-on-surface-variant: #666666;
  --md-sys-color-outline: #e5e5e5;
  --md-sys-color-outline-variant: #eeeeee;

  /* Typography */
  --font-heading: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

---

## 6. Summary Checklist for Migrating Components

1. **Buttons**: Replace saturated colored buttons with `.uber-btn-primary` (black pill), `.uber-btn-secondary` (light gray pill), or `.uber-btn-outline` (white pill with black border).
2. **Page Background**: Ensure all root wrappers use `--surface-canvas` (`#f7f7f7`).
3. **Hero Headers**: Use Pitch Black (`#000000`) background with `#ffffff` titles, `#a3a3a3` subtext, and inverted white CTAs.
4. **Cards**: Set card background to `#ffffff`, border to `1px solid #e5e5e5`, radius to `16px`, and hover border to `#b5b5b5`.
5. **Form Controls**: Use `#f6f6f6` backgrounds with focus rings in `#000000`.
6. **Modals**: Use dark blurred backdrops (`rgba(0, 0, 0, 0.65)` + `blur(4px)`) with rounded white dialogue boxes (`20px` radius).
