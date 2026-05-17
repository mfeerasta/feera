import type { Metadata } from 'next';
import { Geist, Instrument_Serif } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Feera',
  description: 'Padel social network and ecosystem. Play, book, rank, compete.',
  metadataBase: new URL('https://feera.ai'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geist.variable} ${instrumentSerif.variable}`}
    >
      <body className="bg-ink-deep text-cream">{children}</body>
    </html>
  );
}
