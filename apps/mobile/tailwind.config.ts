import type { Config } from 'tailwindcss';
import { feera, edition } from '@feera/ui/tokens';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        court: feera.court,
        cream: feera.surface.cream,
        charcoal: feera.surface.charcoal,
        accent: feera.accent.pink,
        edition: {
          forest: edition.forest,
          ivory: edition.ivory,
          brass: edition.brass,
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        display: ['Söhne', 'Inter', 'system-ui'],
        serif: ['Tiempos Headline', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
