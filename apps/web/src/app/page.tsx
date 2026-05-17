import Link from 'next/link';

/**
 * Marketing landing. flex.one-inspired (ADR-0010): dark forest base, large
 * serif headline, two minimal CTAs, alternating sections, brass-accent
 * Edition teaser.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-deep text-cream">
      {/* Nav */}
      <header className="border-b border-cream/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-serif text-2xl tracking-tight text-cream"
          >
            feera
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/sign-in"
              className="text-cream/80 transition-colors duration-150 hover:text-court"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Section 1 — Hero */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-start justify-center px-6 py-[107px]">
          <h1 className="max-w-[18ch] font-serif text-6xl font-normal leading-none tracking-[-0.02em] text-cream md:text-7xl">
            Padel, properly.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream/70">
            Booking, matchmaking, rankings, tournaments. One quiet platform for
            every player and every club.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/play"
              className="inline-flex items-center justify-center border border-cream px-6 py-3 text-sm text-cream transition-colors duration-150 hover:border-court hover:text-court"
            >
              Find a court
            </Link>
            <Link
              href="/clubs/onboard"
              className="inline-flex items-center justify-center border border-cream/40 px-6 py-3 text-sm text-cream/80 transition-colors duration-150 hover:border-court hover:text-court"
            >
              For clubs
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Credibility strip */}
      <section className="border-y border-cream/10 bg-ink-deep">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-cream/10 px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {['Lahore', 'Karachi', 'Dubai'].map((city) => (
            <div
              key={city}
              className="px-6 py-10 text-center text-xs uppercase tracking-[0.25em] text-cream/60"
            >
              {city}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Feature triplets (inverted) */}
      <section className="bg-cream text-ink-deep">
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
            <article key={feature.title} className="flex flex-col gap-4">
              <div
                aria-hidden
                className="aspect-[4/3] w-full border border-ink-deep/20"
              />
              <h2 className="font-serif text-3xl leading-tight tracking-tight">
                {feature.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink-deep/70">
                {feature.body}
              </p>
              <Link
                href="/sign-in"
                className="text-sm text-ink-deep underline-offset-4 transition-colors duration-150 hover:text-court hover:underline"
              >
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4 — Edition teaser */}
      <section className="bg-ink-shadow">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-8 px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">
            By invitation
          </p>
          <h2 className="max-w-[20ch] font-serif text-5xl leading-tight tracking-tight text-cream md:text-6xl">
            Feera Edition.
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-cream/70">
            A members tier for flagship clubs, annual invitationals, and the
            quieter rituals of the game.
          </p>
          <Link
            href="/edition"
            className="inline-flex items-center justify-center border border-brass px-6 py-3 text-sm text-brass transition-colors duration-150 hover:bg-brass hover:text-ink-deep"
          >
            Apply for invitation
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream/10 bg-ink-deep">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-serif text-xl text-cream">
              feera
            </Link>
            <p className="text-xs text-cream/50">Feera ©2026</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-cream/60 md:grid-cols-5">
            {['About', 'Clubs', 'Careers', 'Privacy', 'Terms'].map((label) => (
              <Link
                key={label}
                href="/"
                className="transition-colors duration-150 hover:text-court"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-cream/40">
            EN
          </div>
        </div>
      </footer>
    </div>
  );
}
