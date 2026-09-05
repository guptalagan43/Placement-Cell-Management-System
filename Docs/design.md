# Design System
## Placement Cell Management System (PCMS) — SKIT, Jaipur

| | |
|---|---|
| **Document Version** | 1.0 |
| **Visual Reference** | User-provided screenshots of a professional institutional portal redesign (Sign In, Sign Up, Applicant Dashboard, Admin Approval View, Admin Configuration, Data/Results Table) |
| **Institutional Identity** | Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur (SKIT) |

---

## 1. Design Reference & Adaptation Note

The visual system below is extracted directly from the reference screenshots you provided: a warm off-white canvas, a confident forest-green brand color, pill-shaped sidebar navigation with a solid-green active state, soft mint-tinted badges and banners, a vertical stepper for approval/status progress, a segmented duration control, and dashed-border quick-action tiles.

**On SKIT branding specifically:** SKIT's public website (skit.ac.in) is a legacy institutional site that doesn't expose a clean, extractable brand-color system (no design tokens, no consistent hex values available from the page itself). Rather than guess at colors from a dated public site, this design system **carries forward the reference portal's refined green palette as the actual UI system**, and layers SKIT's real identity on top as content: official name, "T&P Cell" naming (SKIT's own term for its placement office, per its website), and its actual department list (Section 9). If SKIT has a specific brand guideline document with mandated hex values, swap them into Section 3 — the rest of this system (typography, spacing, components) is brand-color-agnostic and will adapt cleanly.

---

## 2. Design Philosophy

- **Institutional trust, not startup flash.** Generous whitespace, restrained color use, high-contrast text. This is a system a TPO, a faculty coordinator, and a nervous final-year student all need to trust immediately.
- **Status is always legible at a glance.** Every state — eligible/not eligible, application status, offer status, drive lifecycle — is communicated redundantly through color *and* label text *and*, where relevant, an icon. Never color alone.
- **Warm neutral canvas, not stark white.** The reference system uses an off-white/warm-gray background with white cards floating on top — softer and more premium-feeling than pure white-on-white.
- **One accent color used deliberately.** Green carries almost all brand weight (primary actions, active states, success). It is not diluted by competing accent colors elsewhere in the UI.

---

## 3. Color Palette

### 3.1 Brand / Primary (Green)

| Token | Hex | Usage |
|---|---|---|
| `primary-900` | `#0F5A28` | Text-on-light-green emphasis, pressed states |
| `primary-700` (Primary) | `#15803D` | Primary buttons, active sidebar pill, links, focus rings |
| `primary-600` (Hover) | `#146B34` | Primary button hover/pressed |
| `primary-100` (Tint) | `#DCFCE7` | Badge backgrounds, info banners, disabled-button fill |
| `primary-50` (Faint tint) | `#F0FDF4` | Subtle section backgrounds, table header tint (light contexts) |

### 3.2 Neutrals

| Token | Hex | Usage |
|---|---|---|
| `ink-900` | `#111827` | Headings, primary body text |
| `ink-600` | `#4B5563` | Secondary text, labels |
| `ink-400` | `#9CA3AF` | Placeholder text, disabled text, meta timestamps |
| `surface` | `#FFFFFF` | Cards, inputs, table rows |
| `canvas` | `#FAFAFA` | App background |
| `border` | `#E5E7EB` | Card borders, input borders, table dividers |

### 3.3 Semantic (Status)

| Token | Text | Background | Usage |
|---|---|---|---|
| `success` | `#15803D` | `#DCFCE7` | Eligible, Cleared, Active, Accepted, Placed |
| `danger` | `#DC2626` | `#FEE2E2` | Not Eligible, Rejected, Declined, Blacklisted |
| `warning` | `#D97706` | `#FEF3C7` | Pending, In Progress, Deadline Approaching |
| `neutral` | `#6B7280` | `#F3F4F6` | Awaiting, Inactive, Draft, Locked |
| `info` | `#2563EB` | `#DBEAFE` | Informational notices (used sparingly — green already carries most positive-state weight) |

**Rule:** never use `danger` red for anything other than a genuinely negative state (rejection, error, destructive action). It should stay rare enough to carry real weight when it appears — exactly as in the reference (red reserved for "Rejected," "Pause Session," "Cancel," "Revoke Rejection").

---

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| Headings (H1–H4) | **Plus Jakarta Sans**, 600–800 weight | Closest freely-available match to the bold, confident geometric sans in the reference headings ("Sign In," "Sign Up," page titles) |
| Body, labels, table content, buttons | **Inter**, 400–600 weight | Highly legible at small UI sizes; pairs cleanly with Plus Jakarta Sans |

Both are free via Google Fonts, self-hostable for performance.

### Type Scale

| Style | Size / Line-height | Weight | Font |
|---|---|---|---|
| Display (page hero, e.g. "Sign In") | 32px / 40px | 700 | Plus Jakarta Sans |
| H1 (page title) | 28px / 36px | 700 | Plus Jakarta Sans |
| H2 (section title) | 20px / 28px | 600 | Plus Jakarta Sans |
| H3 (card title) | 16px / 24px | 600 | Plus Jakarta Sans |
| Body | 14px / 20px | 400 | Inter |
| Body emphasis | 14px / 20px | 600 | Inter |
| Small / meta / timestamp | 12px / 16px | 500 | Inter |
| Label / overline | 11px / 16px | 600, uppercase, +0.04em tracking | Inter |

---

## 5. Spacing, Radius & Elevation

**Base unit:** 4px. Common values: 8 / 12 / 16 / 24 / 32 / 48px.

| Element | Radius |
|---|---|
| Badges / pills / chips | `9999px` (full) |
| Buttons, inputs, sidebar active item | `8px` |
| Cards, table containers | `16px` |
| Modals / large panels | `20px` |

| Elevation | Shadow | Usage |
|---|---|---|
| Resting card | `0 1px 2px rgba(17,24,39,0.04)` | Default card state |
| Raised (hover, dropdown, modal) | `0 8px 24px rgba(17,24,39,0.08)` | Popovers, modals, hover-elevated cards |

Shadows stay soft and low-opacity throughout — no hard drop shadows anywhere in the reference system.

---

## 6. Component Patterns (from the reference screenshots)

| Component | Pattern |
|---|---|
| **Sidebar navigation** | White/canvas background; icon + label items; nested/expandable sections via chevron; **active item renders as a solid `primary-700` rounded pill with white text**; locked/future items show a muted lock icon in `ink-400` |
| **Top bar** | Logo left; centered rounded search input with icon and placeholder ("Search for an action…"); notification bell as a small dark rounded-square icon with a red dot badge; user block = avatar circle + bold name + role label in `primary-700` + dropdown chevron |
| **Primary button** | Solid `primary-700` fill, white bold text, `8px` radius, full-width in forms |
| **Secondary/outline button** | Colored border + colored text on transparent/white fill (e.g., the "Switch to Diploma" pill button) |
| **Danger button** | Solid or outline `danger` red — reserved for destructive/negative actions (Pause, Cancel, Revoke) |
| **Disabled/muted button** | `primary-100` fill with `primary-700` text at reduced opacity (as seen on "Resend Verification Link") |
| **Badge / status pill** | Fully rounded, semantic color pairing per Section 3.3, small caps or sentence case label |
| **Info/callout banner** | `primary-50`/`primary-100` background, rounded-xl, paired with an inline action button — used for contextual nudges ("Have something you want to change…") |
| **Quick-action tile** | Dashed border, light tint fill, icon + label centered — used for a small grid of shortcut actions |
| **Data table** | Rounded container; header row tinted (green tint for standard tables, amber tint specifically for grading/scoring-style tables); action icons inline in `primary-700`; empty/missing values shown as a plain dash, not left blank |
| **Approval/status stepper** | Vertical timeline of dots connected by a line; **filled `primary-700` dot + green label = cleared/complete**; **hollow gray dot + `ink-400` label = awaiting** — this maps directly onto PCMS's per-round Application status trail |
| **Segmented control** | Pill-shaped container with 2–3 options; active segment = solid `primary-700` fill with white text; inactive = transparent with `ink-600` text — used for short mutually-exclusive toggles (e.g., a duration unit picker) |
| **Filter chip** | Rounded-full outline in `primary-700`, with an inline ✕ to remove — used for active filter tags above a list/table |
| **Search input** | Rounded-full or `8px` radius, subtle border, left-aligned search icon, muted placeholder |

---

## 7. Status Color Mapping (PCMS-specific)

Mapping the semantic tokens (Section 3.3) onto every status field defined in `srs.md`:

| PCMS Status Field | Value | Token |
|---|---|---|
| Eligibility badge | Eligible | `success` |
| Eligibility badge | Not Eligible | `danger` |
| Application — overall status | Applied / In Process | `neutral` |
| Application — overall status | Selected | `success` |
| Application — overall status | Rejected / Withdrawn | `danger` |
| Application — overall status | Waitlisted | `warning` |
| Application — round status | Cleared | `success` |
| Application — round status | Not Cleared / Absent | `danger` |
| Application — round status | Pending / Shortlisted | `warning` |
| Offer status | Accepted | `success` |
| Offer status | Declined / Expired | `danger` |
| Offer status | Pending | `warning` |
| Drive status | Draft | `neutral` |
| Drive status | Published / Registration Open | `success` |
| Drive status | Registration Closed / In Progress | `warning` |
| Drive status | Completed / Results Declared | `neutral` |
| Student — blacklist flag | Blacklisted | `danger` |

---

## 8. Iconography

- **Icon set:** `lucide-react` (already standard across this project's frontend stack per `rules.md`).
- **Stroke width:** 1.5px (matches the clean, light-line icon weight seen in the reference's document/action icons).
- **Default size:** 20px inline with text, 24px standalone (nav, top bar).
- **Color:** icons inherit the surrounding text color (`primary-700` for actionable icons, `ink-600` for neutral/decorative icons) — never a separate arbitrary icon color.

---

## 9. Institutional Identity Content

| Element | Value |
|---|---|
| Full institution name | Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur |
| Short name (nav/logo lockup) | SKIT |
| Placement office name | T&P Cell (Training & Placement Cell) — matches SKIT's own site terminology |
| Location | Jaipur, Rajasthan |
| Affiliation | Rajasthan Technical University (RTU), Kota |
| Departments (use as the canonical branch list in Drive eligibility criteria, per `srs.md` DR-04) | Computer Science & Engineering · Information Technology · Electronics & Communication Engineering · Electrical Engineering · Mechanical Engineering · Civil Engineering · Management Studies · Basic Sciences & Humanities |

**Follow-up for `phases.md`/seed data:** replace any placeholder branch list (e.g., generic "CSE/IT/ECE") with this actual 8-department list when building drive-creation forms and seed/demo data.

---

## 10. Dark Mode Palette

| Token | Light | Dark |
|---|---|---|
| `canvas` | `#FAFAFA` | `#0F1512` |
| `surface` | `#FFFFFF` | `#161D19` |
| `border` | `#E5E7EB` | `#263029` |
| `ink-900` | `#111827` | `#F2F4F2` |
| `ink-600` | `#4B5563` | `#B6BDB9` |
| `primary-700` | `#15803D` | `#22A855` *(brightened for dark-background contrast)* |
| `primary-100` | `#DCFCE7` | `#173324` |

Semantic status colors (Section 3.3) shift the same way: backgrounds darken toward the surface tone, text brightens slightly to maintain contrast — never invert the hue itself (green stays green, red stays red).

---

## 11. Accessibility

- Minimum contrast ratio 4.5:1 for all body text against its background (verify `primary-700` on `canvas`/`surface` — it passes at these values; do not lighten primary further for "brand pop" without re-checking).
- Every status badge pairs color with a text label — never color alone (already enforced by the pattern in Section 6/7).
- All interactive elements have a visible focus ring (`primary-700`, 2px offset) for keyboard navigation.
- Icon-only buttons (e.g., notification bell) always carry an `aria-label`.

---

## 12. Tailwind Theme Token Reference

For direct use when configuring the frontend build (implementation detail — the full component code lives in the actual codebase, not here):

```
colors:
  primary: { 50:#F0FDF4, 100:#DCFCE7, 600:#146B34, 700:#15803D, 900:#0F5A28 }
  ink:     { 400:#9CA3AF, 600:#4B5563, 900:#111827 }
  canvas:  #FAFAFA
  surface: #FFFFFF
  border:  #E5E7EB
  success: { text:#15803D, bg:#DCFCE7 }
  danger:  { text:#DC2626, bg:#FEE2E2 }
  warning: { text:#D97706, bg:#FEF3C7 }
  neutral: { text:#6B7280, bg:#F3F4F6 }
  info:    { text:#2563EB, bg:#DBEAFE }

fontFamily:
  heading: ["Plus Jakarta Sans", "sans-serif"]
  body:    ["Inter", "sans-serif"]

borderRadius:
  pill: 9999px
  md:   8px
  lg:   16px
  xl:   20px
```
