# Frontend UI/UX Design & Architecture Guide — superබාස්

This document outlines the UI/UX architecture, design systems, styling principles, component libraries, typography, color palettes, and assets used in the **superබාස් (SuperBass)** frontend.

---


## 2. UI Component Library & Design System

### Google Material Design 3 (M3)
The application leverages Google's **Material Design 3** philosophy for modernized shapes, elevation, dynamic color tokens, and web components.

* **Component Library**: `@material/web` (`^2.5.0`)
* **Key Components Used**:
  * `<md-filled-button>` — Primary call-to-action (CTA) buttons.
  * `<md-outlined-button>` — Secondary actions and navigation toggles.
  * `<md-icon>` — Material 3 icon containers.
  * `<md-icon-button>` — Header actions, close buttons, and icon triggers.
* **M3 Custom Shapes**:
  * 9-sided Scalloped Cookie Shape SVG geometry (used in the Hero section hero badge/graphic).

---

## 3. Styling Architecture & CSS Strategy

The application avoids heavy CSS utility frameworks like Tailwind CSS or Bootstrap in favor of **modular Vanilla CSS** with **CSS Custom Properties (Design Tokens)**.

### Global Design Tokens (`Frontend/src/index.css`)

```css
:root {
  /* Material 3 Color Tokens */
  --md-sys-color-primary: #FDC101;
  --md-sys-color-on-primary: #18181b;
  --md-sys-color-primary-container: #fef3c7;
  --md-sys-color-on-primary-container: #78350f;

  --md-sys-color-surface: #ffffff;
  --md-sys-color-on-surface: #0f172a;
  --md-sys-color-surface-variant: #f1f5f9;
  --md-sys-color-on-surface-variant: #475569;

  --md-sys-color-outline: #cbd5e1;
  --md-sys-color-outline-variant: #e2e8f0;

  /* Brand Colors & Accents */
  --brand-yellow: #FDC101;
  --brand-yellow-hover: #d97706;
  --brand-yellow-light: #fffbeb;
  --brand-yellow-glow: rgba(245, 158, 11, 0.28);

  /* Typography Stacks */
  --font-heading: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Ambient Gradients */
  --bg-gradient: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, rgba(255, 255, 255, 0) 50%),
                 radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0) 40%);
}
```

### Component-Scoped Stylesheets
* `App.css` — Landing page, navigation bar, hero section, worker categories, and testimonials.
* `Chats.css` — Messaging view, message bubbles, thread list, and input actions.
* `Community.css` — Community feed, discussion threads, posts, comments, and upvoting widgets.
* `components/ChatModal.css` — Floating/modal chat interface with real-time feedback.
* `components/UserMenu.css` — User avatar dropdown, profile links, role switching, and logout styling.

---

## 4. Typography

Typography is fetched directly from Google Fonts:

1. **DM Sans** (`weights: 100..1000, regular & italic`)
   * Primary font for headings, titles, subheadings, and body content.
   * Gives a friendly, clean, and modern aesthetic.
2. **Roboto** (`weights: 400, 500, 700`)
   * Supporting font for specific data points and numeric displays.

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## 5. Iconography

Dual icon system for maximum flexibility:

1. **Google Material Symbols Outlined**
   * Link: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`
   * Used for standard navigation icons, system status, actions, and buttons.
2. **Font Awesome 6 (Free CDN)**
   * Link: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`
   * Used for brand icons, social links, and specialized home service trade symbols.

---

## 6. Interactive Maps & Geo-location UI

* **Leaflet** (`^1.9.4`) & **React-Leaflet** (`^5.0.0`)
  * Displays interactive community worker maps.
  * Allows residents to locate nearby skilled handymen, electricians, plumbers, and mechanics with custom markers and popups.

---

## 7. Authentication & Modals

* **@react-oauth/google** (`^0.12.2`)
  * Google One-Tap and customized Google Sign-In button integration adhering to modern Google identity guidelines.

---

## 8. Mobile App UI (Flutter)

* **Location**: Located in the `/App` directory.
* **Technology**: Built with **Flutter (Dart 3 / Material Design 3)**.
* **Typography**: Integrated with `google_fonts: ^6.3.3` rendering **DM Sans** across all text styles.
* **Design Token Structure**:
  * `lib/theme/app_colors.dart` — Maps CSS color tokens (`--brand-yellow`, `--md-sys-color-*`, glow box-shadows, ambient gradient).
  * `lib/theme/app_theme.dart` — Complete M3 `ThemeData` (DM Sans text theme, StadiumBorder pill buttons, pill search/input decorations, navigation bar styling).
  * `lib/widgets/app_components.dart` — Reusable Flutter components (`BrandBadge`, `PrimaryCtaButton`, `SecondaryOutlinedButton`, `CategoryCard`, `WorkerCard`, `ServiceSearchBar`).
  * `lib/main.dart` — Complete M3 navigation shell with Find, Community, Bookings, Chats, and Account tabs.
