import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Feera',
  description: 'Padel social network and ecosystem. Play, book, rank, compete.',
  metadataBase: new URL('https://feera.ai'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
