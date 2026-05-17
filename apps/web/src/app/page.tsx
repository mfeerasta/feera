import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Marketing landing. flex.one-inspired (ADR-0010): dark forest base, large
 * serif headline, two minimal CTAs, alternating sections, brass-accent
 * Edition teaser.
 *
 * Per-section data-theme: hero + Edition strip stay dark even when the
 * page is in light mode; the feature triplet section stays light even
 * when the page is in dark mode. The middle sections inherit.
 */
export default function HomePage() {
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
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/sign-in"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Section 1 — Hero (always dark) */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-start justify-center px-6 py-[107px]">
          <h1
            className="max-w-[18ch] font-serif text-6xl font-normal leading-none tracking-[-0.02em] text-[color:var(--color-fg)] md:text-7xl"
            style={{ viewTransitionName: 'feera-hero-heading' }}
          >
            Padel, properly.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Booking, matchmaking, rankings, tournaments. One quiet platform for
            every player and every club.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/play"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)]"
            >
              Find a court
            </Link>
            <Link
              href="/clubs/onboard"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-border)] px-6 py-3 text-sm text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5 hover:text-[color:var(--color-accent)]"
            >
              For clubs
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Credibility strip (inherits page theme) */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-[color:var(--color-border)] px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {['Lahore', 'Karachi', 'Dubai'].map((city) => (
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
      <section data-theme="light" className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-[107px] md:grid-cols-3">
          {[
            {
              title: 'Book courts',
              body: 'See live availability across clubs in your city. Pay once, split with friends after.',
            },
            {
              title: 'Find players',
              body: 'Match by level, location, and time. Glicko-2 keeps the ladder honest.',
            },
            {
              title: 'Play tournaments',
              body: 'Club leagues, city opens, and federation events. One bracket, one ranking.',
            },
          ].map((feature) => (
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
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4 — Edition teaser (always dark) */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">
            By invitation
          </p>
          <h2 className="max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Feera Edition.
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            A members tier for flagship clubs, annual invitationals, and the
            quieter rituals of the game.
          </p>
          <Link
            href="/edition"
            className="feera-motion inline-flex items-center justify-center border border-brass px-6 py-3 text-sm text-brass hover:bg-brass hover:text-ink-deep"
          >
            Apply for invitation
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-serif text-xl text-[color:var(--color-fg)]">
              feera
            </Link>
            <p className="text-xs text-[color:var(--color-fg-muted)]">Feera ©2026</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] md:grid-cols-5">
            {['About', 'Clubs', 'Careers', 'Privacy', 'Terms'].map((label) => (
              <Link
                key={label}
                href="/"
                className="feera-motion hover:text-[color:var(--color-accent)]"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
            EN
          </div>
        </div>
      </footer>
    </div>
  );
}
