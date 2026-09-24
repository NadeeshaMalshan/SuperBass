# Material Web (`@material/web`) — Comprehensive Guide & Reference

> **Repository:** [material-components/material-web](https://github.com/material-components/material-web)  
> **Official Documentation:** [Material Web Docs](https://material-web.dev/) & [GitHub Theming Guide](https://github.com/material-components/material-web/tree/main/docs/theming)  
> **Package:** `@material/web` (npm)  
> **Specification:** [Material Design 3 (M3)](https://m3.material.io/)

---

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Design Tokens & Theming System](#2-design-tokens--theming-system)
   - [Token Hierarchy (System vs Component vs Reference)](#token-hierarchy)
   - [System Color Roles & Tokens](#system-color-roles--tokens)
   - [Surface Containers & Elevation](#surface-containers--elevation)
   - [Typography Tokens](#typography-tokens)
   - [Shape Tokens](#shape-tokens)
   - [Motion Tokens](#motion-tokens)
3. [Dynamic Color & Palette Generation](#3-dynamic-color--palette-generation)
4. [Component Library Catalog](#4-component-library-catalog)
5. [Using Material Web with React & Vite](#5-using-material-web-with-react--vite)
   - [Installation & Imports](#installation--imports)
   - [React TypeScript Declarations](#react-typescript-declarations)
   - [Handling Events](#handling-events)
6. [Theming Implementation & Dark Mode](#6-theming-implementation--dark-mode)
7. [Shadow DOM Styling & Customization Rules](#7-shadow-dom-styling--customization-rules)
8. [Best Practices & Common Gotchas](#8-best-practices--common-gotchas)

---

## 1. Overview & Architecture

**Material Web** is Google’s official implementation of **Material Design 3** built as standard **Web Components** (Custom Elements).

### Core Pillars
- **Framework Agnostic**: Runs natively in any environment (React, Vue, Angular, Svelte, or Vanilla JavaScript).
- **Web Standards**: Built with [Lit](https://lit.dev/), utilizing **Shadow DOM** for encapsulation and **CSS Custom Properties** for styling.
- **Accessible (a11y)**: Built-in ARIA support, keyboard navigation, high-contrast support, and screen-reader optimizations.
- **Modular Packaging**: Tree-shakeable; you only import the exact custom elements you need.

---

## 2. Design Tokens & Theming System

Material Web uses CSS custom properties structured according to the M3 token specification.

### Token Hierarchy
Tokens exist at three layers:
1. **Reference Tokens (`--md-ref-*`)**: Raw color palettes, base font metrics, and static values (e.g., `--md-ref-palette-primary40: #6750A4;`).
2. **System Tokens (`--md-sys-*`)**: Semantic tokens mapped to design roles (e.g., color roles, surface levels, type scales). **This is the primary layer you customize.**
3. **Component Tokens (`--md-<component>-*`)**: Scoped variables that control individual component styles (e.g., `--md-filled-button-container-color`, `--md-outlined-text-field-outline-color`).

```
[Reference Tokens] ──> [System Tokens (--md-sys-*)] ──> [Component Tokens (--md-<comp>-*)]
```

---

### System Color Roles & Tokens

M3 color systems are built around semantic roles, ensuring accessibility and contrast ratios.

| System Token | Purpose / Role | Typical Usage |
| :--- | :--- | :--- |
| `--md-sys-color-primary` | High-emphasis accent / brand tone | Primary buttons, active indicators |
| `--md-sys-color-on-primary` | Color for text/icons placed on `primary` | Text inside primary filled button |
| `--md-sys-color-primary-container` | Standout background container | Selected chips, high-priority cards |
| `--md-sys-color-on-primary-container` | Text/icons on `primary-container` | Container text |
| `--md-sys-color-secondary` | Less prominent accent tone | Filter chips, toggles, badges |
| `--md-sys-color-on-secondary` | Text/icons on `secondary` | Text inside secondary elements |
| `--md-sys-color-secondary-container` | Subtle container background | Unselected cards, inactive chips |
| `--md-sys-color-on-secondary-container`| Text/icons on `secondary-container` | Content within secondary containers |
| `--md-sys-color-tertiary` | Balancing accent tone | Highlights, warnings, alternative actions |
| `--md-sys-color-on-tertiary` | Text/icons on `tertiary` | Text on tertiary surfaces |
| `--md-sys-color-tertiary-container` | Background container for tertiary | Tertiary containers |
| `--md-sys-color-on-tertiary-container` | Content on tertiary container | Tertiary labels |
| `--md-sys-color-error` | Destructive/error color | Form validation errors, delete actions |
| `--md-sys-color-on-error` | Content on `error` | Error badge text |
| `--md-sys-color-error-container` | Subtle error background container | Error callout banners |
| `--md-sys-color-on-error-container` | Content on error container | Error banner messages |
| `--md-sys-color-outline` | Subtle border outlines | Input field borders, divider lines |
| `--md-sys-color-outline-variant` | Soft decorative borders | Card borders, list separators |

---

### Surface Containers & Elevation

M3 moves away from pure drop shadows to **tonal elevation** (surfaces tinted with primary color at higher levels) and distinct surface container roles.

| Token | Light Theme Default | Dark Theme Default | Intended Use |
| :--- | :--- | :--- | :--- |
| `--md-sys-color-surface` | Pure/base surface | Base background | Default view background |
| `--md-sys-color-on-surface` | High-contrast text | High-contrast text | Headings, primary body text |
| `--md-sys-color-surface-dim` | Dimmer background | Darker background | Backdrop behind floating elements |
| `--md-sys-color-surface-bright` | Bright surface | Lighter surface | Highlighted rows/cards |
| `--md-sys-color-surface-container-lowest` | Clean white/black | Darkest container | Recessed cards |
| `--md-sys-color-surface-container-low` | Soft contrast | Low-level container | Default card container |
| `--md-sys-color-surface-container` | Standard container | Mid-level container | Sheet, modal or card surfaces |
| `--md-sys-color-surface-container-high` | Elevated container | High-level container | Dialogs, menus, search bars |
| `--md-sys-color-surface-container-highest`| Top container | Highest container | Dropdowns, tooltips, toasts |

#### Elevation Levels
Elevation tokens provide elevation shadows:
- `--md-sys-elevation-level0`: Flat (0px)
- `--md-sys-elevation-level1`: 1dp (cards, unselected chips)
- `--md-sys-elevation-level2`: 3dp (scrolled app bars)
- `--md-sys-elevation-level3`: 6dp (menus, popovers)
- `--md-sys-elevation-level4`: 8dp (modals, dialogs)
- `--md-sys-elevation-level5`: 12dp (floating action buttons, pickers)

---

### Typography Tokens

Material 3 defines 5 typescale roles (`display`, `headline`, `title`, `body`, `label`), each in 3 sizes (`small`, `medium`, `large`).

Each typescale role provides:
- `--md-sys-typescale-<role>-<size>-font`: Font family name.
- `--md-sys-typescale-<role>-<size>-size`: Font size (e.g., `1rem`, `16px`).
- `--md-sys-typescale-<role>-<size>-weight`: Font weight (e.g., `400`, `500`, `700`).
- `--md-sys-typescale-<role>-<size>-line-height`: Line spacing.
- `--md-sys-typescale-<role>-<size>-tracking`: Letter spacing.

#### Typescale Summary
- **Display (`large`, `medium`, `small`)**: Massive hero titles (`57px`, `45px`, `36px`).
- **Headline (`large`, `medium`, `small`)**: Section headings (`32px`, `28px`, `24px`).
- **Title (`large`, `medium`, `small`)**: Card headers and dialog titles (`22px`, `16px`, `14px`).
- **Body (`large`, `medium`, `small`)**: Paragraphs and descriptive copy (`16px`, `14px`, `12px`).
- **Label (`large`, `medium`, `small`)**: Button text, badges, input field labels (`14px`, `12px`, `11px`).

---

### Shape Tokens

Corners in M3 range from square to fully pill-shaped:
- `--md-sys-shape-corner-none`: `0px`
- `--md-sys-shape-corner-extra-small`: `4px`
- `--md-sys-shape-corner-small`: `8px`
- `--md-sys-shape-corner-medium`: `12px`
- `--md-sys-shape-corner-large`: `16px`
- `--md-sys-shape-corner-extra-large`: `28px`
- `--md-sys-shape-corner-full`: `9999px` (Pill shape used on buttons & chips)

---

### Motion Tokens

M3 specifies easing curves and durations for fluid interactions:
- **Easings**:
  - `--md-sys-motion-easing-standard`: `cubic-bezier(0.2, 0.0, 0, 1.0)`
  - `--md-sys-motion-easing-emphasized`: `cubic-bezier(0.2, 0.0, 0, 1.0)`
  - `--md-sys-motion-easing-linear`: `linear`
- **Durations**:
  - `--md-sys-motion-duration-short1`: `50ms`
  - `--md-sys-motion-duration-short2`: `100ms`
  - `--md-sys-motion-duration-medium1`: `250ms`
  - `--md-sys-motion-duration-long1`: `450ms`

---

## 3. Dynamic Color & Palette Generation

Material 3 dynamic theming generates 6 tonal palettes from a single seed color (or brand color) in the **HCT** (Hue, Chroma, Tone) perceptual color space:
1. **Primary**
2. **Secondary**
3. **Tertiary**
4. **Neutral** (surfaces & backgrounds)
5. **Neutral Variant** (borders, dividers, inactive icons)
6. **Error**

### Generating Tokens with `@material/material-color-utilities`

Install the utilities library:
```bash
npm install @material/material-color-utilities
```

Generate light & dark color roles dynamically:
```javascript
import {
  argbFromHex,
  themeFromSourceColor,
  applyTheme
} from '@material/material-color-utilities';

// 1. Convert your brand HEX to ARGB
const seedColor = argbFromHex('#FDC101'); // SuperBass brand yellow

// 2. Generate complete M3 theme
const theme = themeFromSourceColor(seedColor);

// 3. Apply theme tokens to root or a container element
applyTheme(theme, { target: document.body, dark: false });
```

---

## 4. Component Library Catalog

All components in `@material/web` are imported as modules and registered as Custom Elements in the global custom element registry.

### 1. Buttons
- `<md-filled-button>`: Primary high-emphasis button.
- `<md-elevated-button>`: Primary action with elevation shadow.
- `<md-tonal-button>`: Medium-emphasis action using secondary container tones.
- `<md-outlined-button>`: Low-to-medium emphasis bordered action.
- `<md-text-button>`: Flat, borderless button for tertiary actions.

```html
<md-filled-button>Book Now</md-filled-button>
<md-outlined-button>Learn More</md-outlined-button>
```

### 2. Icon Buttons & Icons
- `<md-icon>`: Renders Google Material Symbols font glyphs.
- `<md-icon-button>`: Standard clickable icon button.
- `<md-filled-icon-button>`: High emphasis icon button.
- `<md-filled-tonal-icon-button>`: Medium emphasis icon button.
- `<md-outlined-icon-button>`: Bordered icon button.

```html
<md-icon-button aria-label="Notifications">
  <md-icon>notifications</md-icon>
</md-icon-button>
```

### 3. Floating Action Buttons (FAB)
- `<md-fab>`: Standard floating action button (small, medium, large).
- `<md-branded-fab>`: FAB supporting branded logos or multi-colored icons.

```html
<md-fab label="Post Task" variant="primary">
  <md-icon slot="icon">add</md-icon>
</md-fab>
```

### 4. Text Fields & Selection
- `<md-filled-text-field>` / `<md-outlined-text-field>`: Inputs with floating labels, supporting icons, supporting text, and validation.
- `<md-filled-select>` / `<md-outlined-select>`: Dropdown select with `<md-select-option>`.

```html
<md-outlined-text-field
  label="Service Location"
  placeholder="e.g. Colombo 07"
  value="">
  <md-icon slot="leading-icon">location_on</md-icon>
</md-outlined-text-field>
```

### 5. Chips
- `<md-chip-set>`: Horizontal grouping container.
- `<md-assist-chip>`: Contextual actions (e.g. "Save", "Share").
- `<md-filter-chip>`: Toggleable filter options.
- `<md-input-chip>`: Removable tags / tokens.
- `<md-suggestion-chip>`: AI prompts or quick recommendations.

```html
<md-chip-set>
  <md-filter-chip label="Plumbing" selected></md-filter-chip>
  <md-filter-chip label="Electrical"></md-filter-chip>
  <md-filter-chip label="Carpentry"></md-filter-chip>
</md-chip-set>
```

### 6. Dialogs
- `<md-dialog>`: Accessible modal dialog with headline, content, and action slots.

```html
<md-dialog id="confirm-modal">
  <div slot="headline">Confirm Request</div>
  <div slot="content">Are you sure you want to request this service?</div>
  <div slot="actions">
    <md-text-button form="confirm-modal" value="cancel">Cancel</md-text-button>
    <md-filled-button form="confirm-modal" value="confirm">Confirm</md-filled-button>
  </div>
</md-dialog>
```

### 7. Selection Controls
- `<md-checkbox>`: Three-state checkbox (checked, unchecked, indeterminate).
- `<md-radio>`: Mutually exclusive options.
- `<md-switch>`: Modern M3 toggle switch with optional icons inside the thumb.

### 8. Navigation & Tabs
- `<md-tabs>`: Tabs container.
- `<md-primary-tab>`: Main top-level navigation tabs.
- `<md-secondary-tab>`: Sub-navigation tabs within views.

### 9. Menus & Lists
- `<md-menu>`: Popover menu anchorable to buttons or containers.
- `<md-menu-item>`: Menu items supporting leading/trailing icons.
- `<md-list>`: Clean list container.
- `<md-list-item>`: List entry with headline, supporting text, and interactive states.
- `<md-divider>`: Horizontal or vertical divider rule.

### 10. Progress & Loading
- `<md-circular-progress>`: Circular spinner (determinate or indeterminate).
- `<md-linear-progress>`: Progress bar.

---

## 5. Using Material Web with React & Vite

### Installation & Imports

1. Add `@material/web`:
```bash
npm install @material/web
```

2. Load Material Symbols font in `index.html`:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
```

3. Import the components in your entry file (`main.jsx` or `App.jsx`):
```javascript
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/dialog/dialog.js';
```

---

### React TypeScript Declarations

When using TypeScript with React 19 / 18, declare the custom element tags in a `.d.ts` file (e.g., `src/m3-elements.d.ts`):

```typescript
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
        href?: string;
        type?: 'button' | 'submit' | 'reset';
      };
      'md-outlined-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };
      'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        disabled?: boolean;
      };
      'md-outlined-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
        placeholder?: string;
        type?: string;
        error?: boolean;
        supportingText?: string;
      };
      'md-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        open?: boolean;
      };
    }
  }
}
```

---

### Handling Events

Custom events emitted by Material Web components can be captured using native DOM event listeners or React event handlers:

```jsx
import { useRef, useEffect } from 'react';

export function SearchField({ onSearch }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleInput = (e) => onSearch(e.target.value);
    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [onSearch]);

  return (
    <md-outlined-text-field
      ref={inputRef}
      label="Search services"
      placeholder="Try 'Electrician'">
      <md-icon slot="leading-icon">search</md-icon>
    </md-outlined-text-field>
  );
}
```

---

## 6. Theming Implementation & Dark Mode

You can configure global or localized themes by declaring `--md-sys-*` variables in CSS:

```css
/* Light Theme Defaults */
:root {
  --md-sys-color-primary: #FDC101;
  --md-sys-color-on-primary: #18181b;
  --md-sys-color-primary-container: #fef3c7;
  --md-sys-color-on-primary-container: #78350f;

  --md-sys-color-surface: #ffffff;
  --md-sys-color-on-surface: #0f172a;
  --md-sys-color-surface-container: #f8fafc;
  --md-sys-color-outline: #cbd5e1;
  
  --md-sys-typescale-body-large-font: 'DM Sans', sans-serif;
  --md-sys-shape-corner-medium: 12px;
}

/* Dark Theme Overrides */
[data-theme="dark"],
body.dark {
  --md-sys-color-primary: #f59e0b;
  --md-sys-color-on-primary: #000000;
  --md-sys-color-primary-container: #78350f;
  --md-sys-color-on-primary-container: #fef3c7;

  --md-sys-color-surface: #09090b;
  --md-sys-color-on-surface: #f4f4f5;
  --md-sys-color-surface-container: #18181b;
  --md-sys-color-outline: #3f3f46;
}
```

---

## 7. Shadow DOM Styling & Customization Rules

Because Material Web components encapsulate their template inside a **Shadow DOM**, standard descendant selectors will not penetrate internal elements.

### How to Style Material Web Components:

1. **Use CSS Custom Properties (Recommended)**  
   Variables pierce shadow roots automatically:
   ```css
   /* Global or local component override */
   md-filled-button.cta-button {
     --md-filled-button-container-color: #FDC101;
     --md-filled-button-label-text-color: #18181b;
     --md-filled-button-container-shape: 16px;
   }
   ```

2. **Style Slotted Elements**  
   Elements passed into `<slot>` (like icons or button labels) live in the Light DOM and can be styled normally:
   ```css
   md-filled-button > md-icon {
     --md-icon-size: 20px;
   }
   ```

3. **Avoid targeting internal classes**  
   Never target internal classes (like `.md3-button__ripple`) with CSS as they are private and subject to breaking changes.

---

## 8. Best Practices & Common Gotchas

1. **Font Setup**: Always ensure the Google **Material Symbols** font is loaded in `index.html` if using `<md-icon>`. Otherwise, icons may render as plain text names (e.g. "search", "check").
2. **Component Registration**: Each component must be imported at least once before it will render. Unregistered tags behave like generic inline `<span>` elements without styles.
3. **Form Integration**: `<md-filled-text-field>`, `<md-outlined-text-field>`, and `<md-checkbox>` integrate with standard `<form>` submissions via FormData.
4. **Scoping**: When creating cards or modals with distinct background contrast, apply `--md-sys-color-surface-container` to the wrapper and allow inner M3 components to inherit corresponding tonal colors.
5. **Accessibility**: Always provide `aria-label` on `<md-icon-button>` and form control components when a visible text label is absent.
