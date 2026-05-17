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

/**
 * Inline boot script: reads localStorage.feera-theme before first paint and
 * sets data-theme on <html>. Prevents a flash of the wrong theme. Defaults
 * to dark so existing users see no change. Static literal, no user input,
 * safe by construction.
 */
const themeBoot = `(function(){try{var k='feera-theme';var v=localStorage.getItem(k)||'auto';var r=v;if(v==='auto'){r=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',r);document.documentElement.dataset.themeChoice=v;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="dark"
      className={`${geist.variable} ${instrumentSerif.variable}`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger -- static literal, prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}
