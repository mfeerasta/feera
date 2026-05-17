import type { Config } from 'tailwindcss';
import { palette, feera, edition, fonts } from '@feera/ui/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // flex.one-inspired palette (ADR-0010)
        ink: { deep: palette.inkDeep, shadow: palette.inkShadow, card: palette.inkCard },
        court: palette.court,
        cream: palette.cream,
        paper: palette.paper,
        line: palette.line,
        muted: palette.muted,
        brass: palette.brass,
        // Semantic aliases per brand
        feera: {
          bg: feera.bg,
          fg: feera.fg,
          accent: feera.accent,
        },
        edition: {
          bg: edition.bg,
          fg: edition.fg,
          accent: edition.accent,
        },
      },
      fontFamily: {
        sans: [fonts.sans, 'system-ui', 'sans-serif'],
        serif: [fonts.serif, 'Georgia', 'serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
