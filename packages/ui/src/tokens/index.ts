/**
 * Feera + Feera Edition design tokens — flex.one-inspired (ADR-0010).
 *
 * Same palette serves both tiers. Edition layers brass + serif treatment;
 * Feera leans on the cream + court combo.
 *
 * Computed-style audit on https://flex.one captured 2026-05-17.
 */

export const palette = {
  /** Primary dark background; navbar; cards on light surface. */
  inkDeep: '#071C14',
  /** Deepest contrast; hero, fold. */
  inkShadow: '#051310',
  /** Mid forest; subtle card divider on the dark surface. */
  inkCard: '#1B2F24',
  /** Bright accent green; the only saturated colour. CTAs, hover, focus. */
  court: '#437E5B',
  /** Warm ivory; body text on dark, ivory surfaces. */
  cream: '#F6F3EE',
  /** Pure white; inverted sections. */
  paper: '#FFFFFF',
  /** Thin dividers on light. */
  line: '#DDDDDD',
  /** Subdued borders, captions. */
  muted: '#CCCCCC',
  /** Edition differentiator. Used sparingly. */
  brass: '#A88A3F',
} as const;

export const feera = {
  bg: palette.inkDeep,
  bgFold: palette.inkShadow,
  bgCard: palette.inkCard,
  fg: palette.cream,
  accent: palette.court,
  border: palette.cream + '20', // 12% cream as hairline
  inverted: {
    bg: palette.paper,
    fg: palette.inkDeep,
    border: palette.line,
    muted: palette.muted,
  },
} as const;

export const edition = {
  bg: palette.inkDeep,
  bgFold: palette.inkShadow,
  bgCard: palette.inkCard,
  fg: palette.cream,
  accent: palette.brass,
  border: palette.brass + '40', // 25% brass as Edition hairline
  inverted: {
    bg: '#F5F0E6', // edition ivory (slightly warmer than paper)
    fg: palette.inkDeep,
    border: palette.brass + '40',
    muted: palette.muted,
  },
} as const;

export const fonts = {
  /** Display + headline. Instrument Serif via next/font/google for Phase 1.
   *  flex.one uses Reflex (display) + Redaction (headline); both licensed. */
  serif: 'Instrument Serif',
  /** Body sans. Geist via next/font for Phase 1.
   *  flex.one uses PP Neue Montreal (licensed). */
  sans: 'Geist',
} as const;

export const radius = {
  /** Sharp corners per flex.one — anti-trend, premium signal. */
  none: '0px',
  /** Reserved for asset frames (avatars, images). */
  sm: '4px',
  /** Reserved for full-bleed photo containers. */
  md: '8px',
} as const;

export const spacing = {
  /** Vertical rhythm: small sections. */
  sectionSm: '40px',
  /** Vertical rhythm: large sections (flex.one's section-large = 107px). */
  sectionLg: '107px',
  /** Container horizontal padding on mobile. */
  gutter: '24px',
  /** Max width for centred copy. */
  maxText: '60ch',
  /** Page max width. */
  maxPage: '1280px',
} as const;

export const motion = {
  /** Hover colour shift, no scale, ~150ms. */
  hover: '150ms ease-out',
  /** Section scroll-in reveal. */
  reveal: '500ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export type Brand = 'feera' | 'edition';

export const tokens = {
  feera,
  edition,
  fonts,
  radius,
  spacing,
  motion,
  palette,
} as const;
