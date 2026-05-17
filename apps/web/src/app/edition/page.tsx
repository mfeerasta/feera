import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Feera Edition microsite. M2 stub fully fleshed in M7 with Editorial CMS
 * + flagship club directory + invitational tournament page.
 *
 * Design: quieter than the parent. Brass accent everywhere. Tighter copy.
 * Serif treatments stretched. No images yet (real editorial photography in M7).
 */
export const dynamic = 'force-static';

export const metadata = {
  title: 'Feera Edition',
  description:
    'A members tier for flagship clubs, annual invitationals, and the quieter rituals of the game.',
};

export default function EditionPage() {
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
          <nav className="flex items-center gap-10 text-xs uppercase tracking-[0.25em] text-cream/70">
            <Link href="#membership" className="transition-colors hover:text-brass">
              Membership
            </Link>
            <Link href="#clubs" className="transition-colors hover:text-brass">
              Clubs
            </Link>
            <Link href="#journal" className="transition-colors hover:text-brass">
              Journal
            </Link>
            <Link
              href="/edition/apply"
              className="feera-motion border border-brass px-4 py-2 text-brass hover:bg-brass hover:text-ink-deep"
            >
              Apply
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col justify-center px-6 py-[120px]">
          <p className="text-xs uppercase tracking-[0.4em] text-brass">By invitation</p>
          <h1 className="mt-8 max-w-[16ch] font-serif text-6xl font-normal leading-[1.05] tracking-[-0.02em] text-cream md:text-8xl">
            The quieter side of the game.
          </h1>
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-cream/70">
            A members tier for flagship clubs, annual invitationals, and the
            rituals worth slowing down for. Launching in Lahore, Lisbon, Dubai.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              href="/edition/apply"
              className="border border-brass px-8 py-4 text-sm uppercase tracking-[0.2em] text-brass transition-colors hover:bg-brass hover:text-ink-deep"
            >
              Apply for invitation
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-cream/50">
              Annual membership from USD 1,800
            </p>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section id="membership" className="border-y border-brass/15 bg-ink-deep">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-brass/15 px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              eyebrow: 'Flagship',
              title: 'Six clubs. Three cities.',
              body: 'Reserved court hours, members-only sessions, on-site concierge from Lahore to Lisbon.',
            },
            {
              eyebrow: 'Invitational',
              title: 'One tournament a year.',
              body: 'Sixteen invited members. One flagship club. Two days. Discreet, unhurried, beautiful.',
            },
            {
              eyebrow: 'Journal',
              title: 'A quiet read.',
              body: 'A small editorial brand on craft, place, and the people who play. Printed quarterly.',
            },
          ].map((pillar) => (
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

      {/* Clubs (placeholder — real flagship directory in M7) */}
      <section id="clubs" className="bg-ink-shadow">
        <div className="mx-auto max-w-[1280px] px-6 py-[120px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">Flagship</p>
          <h2 className="mt-6 max-w-[14ch] font-serif text-5xl leading-tight tracking-tight text-cream md:text-6xl">
            The first three.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              { city: 'Lahore', country: 'PK', year: 'Opening 2027' },
              { city: 'Lisbon', country: 'PT', year: 'Opening 2027' },
              { city: 'Dubai', country: 'AE', year: 'Opening 2028' },
            ].map((club) => (
              <article
                key={club.city}
                className="border border-brass/20 p-8 transition-colors hover:border-brass"
              >
                <div
                  aria-hidden
                  className="aspect-[4/3] w-full border border-brass/15"
                />
                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-brass/80">
                  {club.country}
                </p>
                <h3 className="mt-2 font-serif text-3xl leading-tight tracking-tight text-cream">
                  {club.city}
                </h3>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-cream/50">
                  {club.year}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Journal teaser */}
      <section id="journal" className="bg-ink-deep">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 py-[120px] md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-brass">Journal</p>
            <h2 className="mt-6 font-serif text-4xl leading-tight tracking-tight text-cream md:text-5xl">
              On craft, place, and the people who play.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-cream/70">
              Quarterly editorial. Sent to members in print, posted here in full
              the week after.
            </p>
          </div>
          <Link
            href="/edition/journal"
            className="self-start border border-brass px-6 py-3 text-xs uppercase tracking-[0.2em] text-brass transition-colors hover:bg-brass hover:text-ink-deep md:self-end"
          >
            Read the latest
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 px-6 py-[140px] text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-brass">
            Membership
          </p>
          <h2 className="max-w-[18ch] font-serif text-5xl leading-tight tracking-tight text-cream md:text-7xl">
            By invitation, by application.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-cream/70">
            Members are introduced by an existing member or invited by the club.
            Applications are reviewed personally.
          </p>
          <Link
            href="/edition/apply"
            className="mt-4 border border-brass px-10 py-4 text-sm uppercase tracking-[0.2em] text-brass transition-colors hover:bg-brass hover:text-ink-deep"
          >
            Apply
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
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-cream/50 md:grid-cols-4">
            {['Membership', 'Clubs', 'Journal', 'Apply'].map((label) => (
              <Link
                key={label}
                href={
                  label === 'Apply'
                    ? '/edition/apply'
                    : `/edition#${label.toLowerCase()}`
                }
                className="transition-colors hover:text-brass"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex gap-6 text-xs uppercase tracking-[0.2em] text-cream/40">
            <Link href="/" className="transition-colors hover:text-brass">
              Back to Feera
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
