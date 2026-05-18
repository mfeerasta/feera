import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getT } from '@/lib/i18n/t';

/**
 * Marketing landing. flex.one-inspired (ADR-0010): dark forest base, large
 * serif headline, two minimal CTAs, alternating sections, brass-accent
 * Edition teaser.
 *
 * All user-facing copy reads from the active locale's dictionary via
 * `getT()`. The locale itself is resolved in the root layout from the
 * `feera-locale` cookie or the `Accept-Language` header.
 */
export default async function HomePage() {
  const t = await getT();

  const features = [
    { title: t('home.featureBookTitle'), body: t('home.featureBookBody') },
    { title: t('home.featureFindTitle'), body: t('home.featureFindBody') },
    { title: t('home.featurePlayTitle'), body: t('home.featurePlayBody') },
  ];

  const cities = ['Lahore', 'Karachi', 'Dubai'];

  const footerLinks: { key: string; href: string }[] = [
    { key: 'nav.about', href: '/' },
    { key: 'nav.clubs', href: '/clubs' },
    { key: 'nav.careers', href: '/' },
    { key: 'nav.privacy', href: '/privacy' },
    { key: 'nav.terms', href: '/terms' },
    { key: 'nav.apiDocs', href: '/api/docs' },
  ];

  return (
    <div
      className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      style={{ viewTransitionName: 'feera-root' }}
    >
      {/* Nav */}
      <header className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="feera-motion font-serif text-2xl tracking-tight text-[color:var(--color-fg)]"
          >
            feera
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/sign-in"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              {t('common.signIn')}
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Section 1 — Hero (always dark) */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-start justify-center px-6 py-[107px]">
          <h1
            className="max-w-[18ch] font-serif text-6xl font-normal leading-none tracking-[-0.02em] text-[color:var(--color-fg)] md:text-7xl"
            style={{ viewTransitionName: 'feera-hero-heading' }}
          >
            {t('home.heroTitle')}
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/play"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)]"
            >
              {t('home.ctaFindCourt')}
            </Link>
            <Link
              href="/clubs/onboard"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-border)] px-6 py-3 text-sm text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)]"
            >
              {t('home.ctaForClubs')}
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Credibility strip (inherits page theme) */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-[color:var(--color-border)] px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {cities.map((city) => (
            <div
              key={city}
              className="px-6 py-10 text-center text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
            >
              {city}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Feature triplets (always light) */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-[107px] md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="feera-motion group flex flex-col gap-4"
            >
              <div
                aria-hidden
                className="feera-motion aspect-[4/3] w-full border border-[color:var(--color-border)] group-hover:border-[color:var(--color-accent)]"
              />
              <h2 className="font-serif text-3xl leading-tight tracking-tight">
                {feature.title}
              </h2>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                {feature.body}
              </p>
              <Link
                href="/sign-in"
                className="feera-motion text-sm underline-offset-4 hover:text-[color:var(--color-accent)] hover:underline"
              >
                {t('common.learnMore')}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4 — Edition teaser (always dark) */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">
            {t('home.editionEyebrow')}
          </p>
          <h2 className="max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            {t('home.editionTitle')}
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            {t('home.editionBody')}
          </p>
          <Link
            href="/edition"
            className="feera-motion inline-flex items-center justify-center border border-brass px-6 py-3 text-sm text-brass hover:bg-brass hover:text-ink-deep"
          >
            {t('home.editionCta')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="font-serif text-xl text-[color:var(--color-fg)]"
            >
              feera
            </Link>
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              {t('footer.copyright')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] md:grid-cols-5">
            {footerLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="feera-motion hover:text-[color:var(--color-accent)]"
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
          <LocaleSwitcher />
        </div>
      </footer>
    </div>
  );
}
