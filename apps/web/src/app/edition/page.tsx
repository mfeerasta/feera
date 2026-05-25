import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getT } from '@/lib/i18n/t';

const PILLAR_IMAGES = [
  '/images/edition/pillar-clubs.png',
  '/images/edition/pillar-invitational.png',
  '/images/edition/pillar-rituals.png',
];

/**
 * Feera Edition microsite. M2 stub fully fleshed in M7 with Editorial CMS
 * + flagship club directory + invitational tournament page.
 *
 * Design: quieter than the parent. Brass accent everywhere. Tighter copy.
 * Serif treatments stretched. No images yet (real editorial photography in M7).
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Feera Edition',
  description:
    'A members tier for flagship clubs, annual invitationals, and the quieter rituals of the game.',
};

export default async function EditionPage() {
  const t = await getT();

  const pillars = [
    {
      eyebrow: t('edition.pillar1Title'),
      title: t('edition.pillar1Title'),
      body: t('edition.pillar1Body'),
    },
    {
      eyebrow: t('edition.pillar2Title'),
      title: t('edition.pillar2Title'),
      body: t('edition.pillar2Body'),
    },
    {
      eyebrow: t('edition.pillar3Title'),
      title: t('edition.pillar3Title'),
      body: t('edition.pillar3Body'),
    },
  ];

  const clubs = [
    { city: 'Lahore', country: 'PK', year: '2027' },
    { city: 'Lisbon', country: 'PT', year: '2027' },
    { city: 'Dubai', country: 'AE', year: '2028' },
  ];

  return (
    <div data-theme="dark" className="min-h-screen bg-ink-deep text-cream">
      {/* Nav */}
      <header className="border-b border-brass/20">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6">
          <Link
            href="/edition"
            className="font-serif text-xl uppercase tracking-[0.4em] text-brass"
          >
            Feera Edition
          </Link>
          <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.25em] text-cream/70">
            <Link href="#membership" className="transition-colors hover:text-brass">
              {t('edition.pillar1Title')}
            </Link>
            <Link href="#clubs" className="transition-colors hover:text-brass">
              {t('nav.clubs')}
            </Link>
            <Link href="#journal" className="transition-colors hover:text-brass">
              {t('edition.pillar3Title')}
            </Link>
            <Link
              href="/edition/apply"
              className="feera-motion border border-brass px-4 py-2 text-brass hover:bg-brass hover:text-ink-deep"
            >
              {t('common.apply')}
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col justify-center px-6 py-[120px]">
          <p className="text-xs uppercase tracking-[0.4em] text-brass">
            {t('edition.eyebrow')}
          </p>
          <h1 className="mt-8 max-w-[16ch] font-serif text-6xl font-normal leading-[1.05] tracking-[-0.02em] text-cream md:text-8xl">
            {t('edition.title')}
          </h1>
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-cream/70">
            {t('edition.subtitle')}
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              href="/edition/apply"
              className="border border-brass px-8 py-4 text-sm uppercase tracking-[0.2em] text-brass transition-colors hover:bg-brass hover:text-ink-deep"
            >
              {t('edition.applyCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section id="membership" className="border-y border-brass/15 bg-ink-deep">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-brass/15 px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="px-10 py-16">
              <p className="text-xs uppercase tracking-[0.3em] text-brass/80">
                {pillar.eyebrow}
              </p>
              <h2 className="mt-6 font-serif text-3xl leading-tight tracking-tight text-cream">
                {pillar.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream/70">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Clubs */}
      <section id="clubs" className="bg-ink-shadow">
        <div className="mx-auto max-w-[1280px] px-6 py-[120px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">
            {t('edition.pillar1Title')}
          </p>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {clubs.map((club, idx) => (
              <article
                key={club.city}
                className="border border-brass/20 overflow-hidden transition-colors hover:border-brass"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={PILLAR_IMAGES[idx] ?? ''}
                    alt={club.city}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-8">
                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-brass/80">
                  {club.country}
                </p>
                <h3 className="mt-2 font-serif text-3xl leading-tight tracking-tight text-cream">
                  {club.city}
                </h3>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cream/50">
                  {club.year}
                </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 px-6 py-[140px] text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-brass">
            {t('edition.eyebrow')}
          </p>
          <Link
            href="/edition/apply"
            className="mt-4 border border-brass px-10 py-4 text-sm uppercase tracking-[0.2em] text-brass transition-colors hover:bg-brass hover:text-ink-deep"
          >
            {t('common.apply')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brass/15 bg-ink-deep">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Link
              href="/edition"
              className="font-serif text-sm uppercase tracking-[0.4em] text-brass"
            >
              Feera Edition
            </Link>
            <p className="text-xs text-cream/40">Feera Edition ©2026</p>
          </div>
          <LocaleSwitcher />
          <div className="flex gap-6 text-xs uppercase tracking-[0.2em] text-cream/40">
            <Link href="/" className="transition-colors hover:text-brass">
              {t('common.back')} Feera
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
