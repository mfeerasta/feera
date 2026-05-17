/**
 * Brand tokens. Source of truth for Tailwind v4 @theme and NativeWind config.
 * See docs/brand/tokens.md.
 */

export const feera = {
  court: { primary: '#0F4D2C', hover: '#186940', active: '#094020' },
  surface: { cream: '#FAF8F4', charcoal: '#1A1A1A' },
  accent: { pink: '#FF4D8B' },
} as const;

export const edition = {
  forest: '#0A2E1D',
  ivory: '#F5F0E6',
  brass: '#A88A3F',
  charcoal: '#1A1A1A',
} as const;

export const fonts = {
  sansBody: 'Inter',
  sansDisplay: 'Söhne',
  serifEdition: 'Tiempos Headline',
} as const;

export type Brand = 'feera' | 'edition';
