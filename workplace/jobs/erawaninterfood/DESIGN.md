# Design System Inspired by Home

> Auto-extracted from `https://erawaninterfood.com/Home` on 2026-08-28

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "วุ้นเส้นแห้ง ตราชอช้าง - 500 กรัม".

**Key Characteristics:**
- Sukhumvit Set as the heading font (custom web font loaded via @font-face)
- Kanit as the body font for all running text
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#1c2e77` used for CTAs and brand highlights
- 6 shadow level(s) detected — tinted shadows
- Rounded corners (50px+) creating a friendly, approachable feel
- Tags: light, rounded, monochrome, compact, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#1c2e77`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#03124c`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#000000`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#656665`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#fffefb`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | block | large | text-dark |
| 2 | `#03124c` | `--palette-2` | block | medium | text-light |
| 3 | `#656665` | `--palette-3` | button | small | text-light |
| 4 | `#1c2e77` | `--palette-4` | text-accent | small | text-light |

## 3. Typography Rules

- **Heading Font:** `Sukhumvit Set` (web font)
- **Body Font:** `Kanit` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H2 | Sukhumvit Set | 16px | 700 | 19.2px | normal |
| Body | Kanit | 10px | 400 | 18px | normal |
| Small | Kanit | 16px | 400 | 24px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `36px` | headings |
| H1 | `28px` | headings |
| H2 | `22px` | headings |
| H3 | `20px` | headings |
| H4 | `18px` | headings |
| Body L | `17px` | body / supporting text |
| Body | `16px` | body / supporting text |
| Small | `15px` | body / supporting text |
| XS | `14px` | body / supporting text |
| Caption | `13px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #ffffff;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #040404;
  border-radius: 0px;
  padding: 10px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #000000;
  border-radius: 0px;
  padding: 10px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Pill Button

```css
.btn-pill {
  background: #ffffff;
  color: #000000;
  border-radius: 800px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

## 5. Layout Principles

- **Base spacing unit:** `10px` — use multiples (20px, 30px, 40px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `10px` | element |
| spacing-2 | `50px` | card |
| spacing-3 | `8px` | element |
| spacing-4 | `1px` | element |
| spacing-5 | `30px` | card |
| spacing-6 | `6px` | element |
| spacing-7 | `15px` | element |
| spacing-8 | `12px` | element |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-card | `50px` | card |
| radius-subtle | `4px` | subtle |
| radius-card | `30px` | card |
| radius-subtle | `3px` | subtle |
| radius-card | `20px` | card |
| radius-subtle | `5px` | subtle |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(0, 0, 0, 0) 0px 0px 1px 0px` | Cards, subtle elevation |
| Mid | `rgba(0, 0, 0, 0.15) 0px 4px 12px 0px` | Dropdowns, popovers |
| High | `rgba(0, 0, 0, 0.18) 0px 8px 16px 0px` | Modals, floating elements |
| Mid | `rgba(0, 0, 0, 0.13) 0px 0px 11px 0px` | Dropdowns, popovers |
| Mid | `rgba(0, 0, 0, 0.25) 0px 2px 5px 0px` | Dropdowns, popovers |


## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `Sukhumvit Set` for all headings and `Kanit` for body text
- Use `#1c2e77` as the single dominant accent/CTA color
- Maintain `10px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`50px`+) consistently for all interactive elements
- Stick to grayscale + `#1c2e77` accent — avoid color overload
- Apply the shadow system for elevation — use the extracted shadow values

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Sukhumvit Set/Kanit with generic alternatives
- Don't use irregular spacing — stick to 10px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't add additional saturated colors beyond the primary accent
- Don't use oversized hero text — this brand uses restrained type
- Don't use pure black (#000000) for text — use `#000000` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 10px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #000000
Accent:      #1c2e77
Border:      #fffefb
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `Sukhumvit Set` heading in `#000000`, and a `#1c2e77` CTA button with 800px radius."
2. "Create a pricing card using background `#03124c`, border `#fffefb`, `Kanit` for text, and 30px padding."
3. "Design a navigation bar — `#ffffff` background, `#000000` links, `#1c2e77` for active state."
4. "Build a feature grid with 3 columns, 30px gap, each card using the card component style."
5. "Create a footer with `#000000` background, `#ffffff` text, and 20px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 181 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--blue` | `#007bff` |
| `--indigo` | `#6610f2` |
| `--purple` | `#6f42c1` |
| `--pink` | `#e83e8c` |
| `--red` | `#dc3545` |
| `--orange` | `#fd7e14` |
| `--yellow` | `#ffc107` |
| `--green` | `#28a745` |
| `--teal` | `#20c997` |
| `--cyan` | `#17a2b8` |
| `--white` | `#fff` |
| `--gray` | `#6c757d` |
| `--gray-dark` | `#343a40` |
| `--primary` | `#007bff` |
| `--secondary` | `#6c757d` |
| `--success` | `#28a745` |
| `--info` | `#17a2b8` |
| `--warning` | `#ffc107` |
| `--danger` | `#dc3545` |
| `--light` | `#f8f9fa` |
| `--dark` | `#343a40` |
| `--antd-wave-shadow-color` | `#1890ff` |
| `--tmt-primary-orange` | `#E53625` |
| `--tmt-primary-orange-mid` | `#FFBB96` |
| `--tmt-primary-orange-light` | `#FFF4F0` |
| `--tmt-primary-red` | `#B12629` |
| `--tmt-primary-red-mid` | `#FFA39E` |
| `--tmt-primary-red-light` | `#FFF1F0` |
| `--tmt-aliceblue` | `#D6E0F2` |
| `--tmt-aliceblue-mid` | `#E3ECFB` |
| ... | *(128 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--breakpoint-xs` | `0` |
| `--breakpoint-sm` | `576px` |
| `--breakpoint-md` | `768px` |
| `--breakpoint-lg` | `992px` |
| `--breakpoint-xl` | `1200px` |
| `--token-radius` | `6px` |
| `--token-product-title-size` | `16px` |
| `--token-product-desc-size` | `14px` |
| `--token-product-price-size` | `24px` |
| `--token-product-price-old-size` | `14px` |
| `--button-border` | `0px` |
| `--button-borderhover` | `0px` |
| `--button-borderradius` | `10px` |
| `--button-borderradiushover` | `10px` |

### Typography Variables

| Variable | Value |
|---|---|
| `--font-family-sans-serif` | `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"` |
| `--font-family-monospace` | `SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace` |
| `--token-font` | `'Prompt',sans-serif` |
| `--token-text-h1` | `35px` |
| `--token-text-h2` | `24px` |
| `--token-text-body` | `16px` |
| `--token-text-body-strong` | `16px` |
| `--token-text-body-sm` | `14px` |

### Other Variables

| Variable | Value |
|---|---|
| `--token-grad-angle` | `90deg` |
