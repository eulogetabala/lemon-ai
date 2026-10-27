---
name: Lemon Zest SaaS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424936'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727a64'
  outline-variant: '#c2cab0'
  surface-tint: '#446900'
  primary: '#446900'
  on-primary: '#ffffff'
  primary-container: '#a3e635'
  on-primary-container: '#416400'
  inverse-primary: '#98da27'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#416900'
  on-tertiary: '#ffffff'
  tertiary-container: '#9de737'
  on-tertiary-container: '#3e6500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2f746'
  primary-fixed-dim: '#98da27'
  on-primary-fixed: '#121f00'
  on-primary-fixed-variant: '#334f00'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#acf847'
  tertiary-fixed-dim: '#91db2a'
  on-tertiary-fixed: '#102000'
  on-tertiary-fixed-variant: '#304f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies an energetic, creative, high-velocity SaaS ethos tailored for modern social creators, growth agencies, and digital marketing teams. It combines the structured reliability of high-tier workspace utilities with the refreshing, dopamine-driven punch of modern creative tools. 

### Design Movements & Visual Expression
- **Modern Tactile Minimal:** High-contrast neutral canvases (`#FAFAF9` and `#FFFFFF`) punctuated with hyper-tactile, punchy interactive nodes. 
- **Zesty Electric Micro-Interactions:** Electric lime (`#A3E635`) functions as the system's kinetic signature, commanding decisive primary actions, real-time generation indicators, and interactive highlights.
- **Glass & Frosted Nuances:** Subtle backdrop blurs (`backdrop-blur-md`) along sticky floating panels, segmented controls, and pill bars to sustain context across dense content grids.
- **Clean Geometric Rhythm:** Expressed through generous rounded contours (`rounded-2xl` cards and floating navigation, fully rounded capsule pills) that humanize analytical data feeds and scheduling timelines.

## Colors

The palette leverages an electric lime hero against slate-tinted canvas structures, balanced by deep obsidian tones for grounded typographic authority.

### Palette Hierarchy & Intent
- **Primary (`#A3E635` / `#84CC16`):** Reserved for primary calls-to-action, active stage triggers, calendar today badges, and key AI interactive buttons. Text placed over solid `#A3E635` adopts `#0F172A` to maintain crisp contrast and eliminate eye fatigue.
- **Secondary (`#0F172A` / `#1E293B`):** Deep obsidian slate driving typography, focused state borders, high-contrast modal backdrops, and active channel glyphs.
- **Tertiary Accent (`#D9F99D` / `#ECFCCB`):** Soft lime washes utilized for secondary hover states, active tab highlights, pill indicator pills, and subtle border halos on featured pricing or status cards.
- **Canvas Neutrals:**
  - Base Viewport Background: `#FAFAF9` (warm stone-tinted crisp neutral)
  - Surface Containers & Modals: `#FFFFFF`
  - Subtle Dividing Lines & Borders: `#E2E8F0` / `#F1F5F9`
  - Secondary Text & Metadata: `#64748B`
- **Network Accents:** Soft contextual tokens supporting platform identities without polluting the primary brand rhythm (X: `#0F172A`, LinkedIn: `#0A66C2`, Instagram: `#E1306C`, Facebook: `#1877F2`, YouTube: `#FF0000`, TikTok: `#000000`).

## Typography

The type scale uses Plus Jakarta Sans across all roles. Its geometric roundness and generous x-height give UI copy a confident, friendly edge, while tight negative letter-spacing on display and headline tiers guarantees visual impact.

### Typographic Hierarchy Rules
- **Display & Headings:** Rendered with weights `700` and `800`. Always set with tight negative letter tracking (`-0.02em` to `-0.03em`) to anchor dashboards, kanban column heads, and billing pricing tiers.
- **Body Content:** Rendered in regular `400` or medium `500` weights for feed previews, tooltips, and scheduling metadata.
- **Labels & Micro-Copy:** Uppercase utility labels (`label-caps`) use `0.06em` tracking for subheadings, calendar column dates, and channel categories. Interactive chip and button labels leverage weight `600` for crisp optical clarity.

## Layout & Spacing

The layout is built around a hybrid app shell featuring an integrated 260px vertical sidebar alongside an adaptable multi-column content stage.

### Layout Mechanics
- **Dashboard Shell:** The primary workbench utilizes a pinned navigation column on desktop, transitioning to an off-canvas drawer below the `1024px` breakpoint.
- **Content Stage:** Floats within an expansive viewport with `margin` of `2rem` (32px) on desktop and `margin-mobile` of `1rem` (16px).
- **Kanban & Calendar Views:** Use fluid equal-width columns. Kanban lanes flex with a minimum column width of 260px; calendars arrange in 7 equal grid tracks separated by crisp hairline boundaries with `space-sm` cell padding.
- **Adaptive Breakpoints:**
  - **Desktop (≥ 1280px):** 12-column grid or 4-lane kanban / 7-column calendar, persistent sidebar.
  - **Tablet (768px – 1279px):** Collapsed icon-only sidebar, horizontally scrollable multi-lane boards, 2-column pricing tiers.
  - **Mobile (< 768px):** Single-column stacked cards, full-bleed calendar day/agenda views, bottom floating utility action bar.

## Elevation & Depth

This design system favors stacked luminous surfaces, delicate ambient drop shadows, and razor-sharp border outlines over heavy dark drops.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#FAFAF9` foundational background. Interactive zones are articulated purely via white card containment and hairline borders (`#E2E8F0`).
- **Level 1 (Surface Containers):** Main content workspaces, kanban column wells, and calendar shells. `#FFFFFF` with `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03)` wrapped in a `1px` border of `rgba(226, 232, 240, 0.8)`.
- **Level 2 (Hover & Draggable Cards):** Kanban cards, calendar entries, and selectable pricing cards. `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Overlays & Drawers):** Quick post composers, AI idea generators, and channel connect modals. `box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15)` paired with a soft `rgba(15, 23, 42, 0.35)` backdrop blur (`backdrop-blur-sm`).
- **Luminous Accent Glow:** High-priority cards (e.g., featured Pro plan) replace dark shadows with a focused lime aura: `box-shadow: 0 0 0 2px #A3E635, 0 12px 30px -10px rgba(163, 230, 53, 0.3)`.

## Shapes

The design system implements a roundedness tier of `3` (pill-dominant foundation). This creates an inviting, tactile workspace that feels fast and expressive.

### Geometry Hierarchy
- **Pills (`rounded-full`):** All action buttons, calendar navigation toggles, segmented view switchers, status badges, and user profile wrappers.
- **Large Surfaces (`rounded-2xl` / 1.5rem – 2rem):** Outer application cards, kanban board columns, pricing tier containers, and modal sheets.
- **Intermediate Nodes (`rounded-xl` / 0.75rem – 1rem):** Individual post preview tiles, scheduled list items, input text fields, and channel connection strips.
- **Micro Elements (`rounded-lg` / 0.5rem):** Social platform brand glyph enclosures, tooltips, and calendar day sub-cells.

## Components

### Buttons
- **Primary Button:** Capsule pill shape (`rounded-full`), solid `#A3E635` background, `#0F172A` bold text (`label-lg`), height `44px` (or `40px` compact). Hover state: `#84CC16` with a gentle `scale-[1.01]` transition. Active: `scale-[0.98]`.
- **Secondary / Ghost Button:** Transparent background, `1px solid #E2E8F0`, dark slate text (`#1E293B`). Hover state: `#F1F5F9` background with `#0F172A` text.
- **AI Action Button:** Pill container with a subtle gradient rim or subtle shimmer. `#FFFFFF` background with an electric lime border (`#A3E635`), displaying a sparkle/wand glyph with `#84CC16` accenting.

### Chips & Badges
- **Status Pills:** Fully rounded micro-badges (`rounded-full`) with `padding: 4px 12px`. Light pastel fills (`#ECFCCB` for active/completed, `#FEF3C7` for scheduled/pending, `#F1F5F9` for unassigned) with matched high-contrast text.
- **Social Channel Badges:** Squircle containers (`rounded-xl`) housing official platform vectors alongside an indicator dot (lime for connected, neutral grey for offline).

### Cards & Kanban Lanes
- **Container Structure:** Crisp white `#FFFFFF` surface mounted within the warm `#FAFAF9` canvas, utilizing `rounded-2xl` corners and `1px` subtle perimeter lines.
- **Lane Heads:** Display lane titles in `headline-sm` with a secondary circular counter badge (`#F1F5F9`) denoting total items, accompanied by an inline ghost action button for quick creation.
- **Content Cards:** Clean spacing (`space-md`), high-contrast body typography, multi-channel avatar bubbles, and scheduled timestamp pills placed along the base edge.

### Inputs & Form Fields
- **Search & Text Boxes:** Pill-shaped (`rounded-full`) for global search bars, or `rounded-xl` for multi-line composers. White `#FFFFFF` fill with `1px solid #E2E8F0`. 
- **Focus State:** Transitions to `border-color: #A3E635` with an electric lime ring (`box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.25)`).

### Selection Controls
- **Checkboxes:** `rounded-lg` (6px) with an obsidian border. When checked: solid `#0F172A` with a white checkmark or `#A3E635` with an obsidian checkmark.
- **Segmented View Switcher (List vs. Calendar):** Pill container (`#F1F5F9` or `#FFFFFF` bordered) housing capsule tabs. Active tab renders with pure `#FFFFFF`, soft ambient drop shadow, and bold obsidian label.