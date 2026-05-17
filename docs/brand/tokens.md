# Visual identity tokens

Source of truth for `packages/ui/src/tokens/`. Tokens are exported as TypeScript constants and consumed by Tailwind config in web + NativeWind config in mobile.

## Feera (parent)

### Color

| Token | Hex | Role |
|---|---|---|
| `feera.court.primary` | `#0F4D2C` | Primary brand, headers, links default state |
| `feera.court.hover` | `#186940` | Hover, focus rings |
| `feera.court.active` | `#094020` | Active, pressed |
| `feera.surface.cream` | `#FAF8F4` | Page background, light cards |
| `feera.surface.charcoal` | `#1A1A1A` | Dark surface, body text on light |
| `feera.accent.pink` | `#FF4D8B` | CTAs only, used sparingly |

### Typography

- Wordmark + display: **Söhne** (placeholder; license TBD).
- Body: **Inter** (open source via next/font/google).
- Sizes: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 (pt on mobile, rem on web mapped 1rem = 16px).

### Voice

Confident, modern, regionally-fluent, slightly playful. Active voice. Short sentences.

## Feera Edition (members tier)

### Color

| Token | Hex | Role |
|---|---|---|
| `edition.forest` | `#0A2E1D` | Primary, Edition headers |
| `edition.ivory` | `#F5F0E6` | Page background |
| `edition.brass` | `#A88A3F` | Accents, dividers, brass details |
| `edition.charcoal` | `#1A1A1A` | Body text |

### Typography

- Wordmark + display: **Tiempos Headline** (classical serif).
- Body: **Söhne** (sans) for legibility, restrained.
- Letter-spacing on wordmark: +0.08em uppercase.

### Voice

Quiet, restrained, editorial. Never shouty. Long-form ok in Journal context.

## Photography direction

See `docs/brand/photography.md`.

- Feera: vibrant, golden hour, real players in motion, slightly grainy film aesthetic, real Pakistani and Gulf locations.
- Edition: editorial, architectural restraint, golden hour, often without people. Never staged. Think Aesop, Hermès print, Cereal magazine.

## Token export contract

`packages/ui/src/tokens/colors.ts`:

```ts
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
```

Tailwind + NativeWind both consume the same module.
