import type { Metadata } from 'next';
import {
  Geist,
  Instrument_Serif,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary, isRtl } from '@feera/i18n';
import { I18nProvider } from '@/lib/i18n/context';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
});
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-arabic',
  display: 'swap',
});
const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-urdu',
  display: 'swap',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme="dark"
      className={`${geist.variable} ${instrumentSerif.variable} ${notoNaskh.variable} ${notoNastaliq.variable}`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger -- static literal, prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
