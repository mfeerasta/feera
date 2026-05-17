# 0010. Design system: flex.one-inspired quiet-luxury aesthetic

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: brand, ui, frontend

## Context

M chose flex.one as the visual north star for Feera + Feera Edition. We extracted the real design system live via Playwright on 2026-05-17.

## What flex.one actually does

Computed-style audit on `https://flex.one`:

### Palette

| Token | Hex | Role |
|---|---|---|
| ink-deep | `#071C14` | Primary background, navbar |
| ink-shadow | `#051310` | Hero, deepest contrast |
| ink-card | `#1B2F24` | Cards and section dividers |
| court | `#437E5B` | Bright accent green, hover, focus |
| cream | `#F6F3EE` | Body text on dark, ivory surfaces |
| paper | `#FFFFFF` | Inverted sections |
| line | `#DDDDDD` | Thin dividers on light |
| muted | `#CCCCCC` | Subdued borders, captions |

The whole site is built on a dark forest base with cream type. Light sections invert (paper bg + ink text) and the bright `court` accent shows up as the only saturated colour.

### Typography

| Role | Family | Size | Weight | Letter-spacing | Line-height |
|---|---|---:|---:|---:|---:|
| Display (H1) | Reflex (serif/sans hybrid) | 46.6 px | 400 | -0.13 px | 1.00 |
| Headline (H2) | Redaction (transitional serif) | 39.9 px | 400 | -1.07 px | 1.10 |
| Sub-headline | Redaction | 33.3 px | 400 | -1.07 px | 1.20 |
| Body | PP Neue Montreal (sans) | 13.3-16.6 px | 400 | normal | 1.50 |
| CTA / caption | PP Neue Montreal | 13.3 px | 400 | normal | 1.50 |

Reflex and Redaction are licensed. For Phase 1 Feera we use open-source proxies:

- **Display + headline**: [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) (free, weight 400, transitional serif with the same restrained luxury feel as Redaction).
- **Body**: [Geist](https://vercel.com/font) or [Inter Display](https://rsms.me/inter/) (both free; Geist matches PP Neue Montreal's geometry more closely).

We may swap to licensed fonts in Phase 2 when budget allows.

### Components

- **CTAs**: sharp corners (`border-radius: 0`), 1px border, transparent fill, weight 400. No drop-shadow, no gradient. Hover changes border + text colour, no scale.
- **Sections**: vertical padding alternates 40 px (small) and 107 px (large) for rhythm.
- **Cards**: minimal. The page leans on whitespace and typography rather than card chrome.
- **Navbar**: flat, no backdrop blur, no shadow. Aligns with the section bg.

### Motion

- Hero uses a parallax phone mockup.
- Section transitions are scroll-driven (Webflow IX), not micro-interactions.
- CTAs have no hover scale; they shift colour only.

## Decision

Adopt flex.one's aesthetic wholesale as the **default Feera** design system. Map it onto our brand tokens:

- Feera tier uses the full flex.one palette (forest + cream + court accent).
- Feera Edition uses the same palette plus brass (`#A88A3F`) as the differentiating accent, swaps the body sans to a thinner cut, and adds the all-caps wordmark treatment.

This **supersedes the M1 brand tokens** in `docs/brand/tokens.md`. Update the doc to match.

## Implementation plan (M3 follow-up)

1. `packages/ui/src/tokens/index.ts` — replace existing palette with the flex.one-inspired tokens.
2. `apps/web/src/app/globals.css` — replace `@theme` block with the new variables. Drop the bright pink accent; surfacing happens through whitespace + serif.
3. Install Instrument Serif + Geist via `next/font/google`.
4. Rewrite the landing page (`/`) to match the flex.one rhythm: dark hero with a thin nav, a large serif headline (max width 18ch), a one-line subhead, two minimal CTAs, then alternating light/dark sections below.
5. Update the admin shell to use the same dark+cream theme but with smaller display sizes (admin density beats marketing drama).
6. Touch up the existing UI primitives (`apps/web/src/components/ui/*.tsx`) to use the new tokens.
7. NativeWind config in `apps/mobile/tailwind.config.ts` mirrors the same palette so the mobile + web visual language is identical.

## Consequences

- Positive: instantly distinct visual identity that signals premium without shouting. Matches the spec's "premium-leaning but accessible".
- Positive: token unification means Feera + Edition share one design system; Edition layers brass + serif treatment on top instead of being a separate stack.
- Negative: flex.one's typography choices need licensed-font discipline if we ever want pixel-perfect parity. Mitigation: open-source proxies for Phase 1, license review before any paid-tier launch.
- Follow-up: ADR-00NN once we decide whether to license Reflex + Redaction (or PP Neue Montreal) in Phase 2.
