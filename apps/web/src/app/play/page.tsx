import Link from 'next/link';

/**
 * Player landing. Hero, two CTAs, three city cards.
 */
export default function PlayHome() {
  const cities = [
    {
      name: 'Lahore',
      country: 'PK',
      blurb: 'Twelve clubs, growing fast. DHA, Gulberg, Bahria.',
    },
    {
      name: 'Karachi',
      country: 'PK',
      blurb: 'Coastal courts, evening sea breeze, late play.',
    },
    {
      name: 'Dubai',
      country: 'AE',
      blurb: 'Climate-controlled flagship venues across the Marina.',
    },
  ];

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto flex min-h-[70vh] max-w-[1280px] flex-col items-start justify-center px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
            Play
          </p>
          <h1 className="mt-6 max-w-[20ch] font-serif text-6xl font-normal leading-none tracking-[-0.02em] text-cream md:text-7xl">
            Find a court. Book a slot. Play with anyone.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream/70">
            Live availability across clubs in your city. Solo or with three
            friends. Open the seat to strangers and we will match you on level.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/play/clubs"
              className="inline-flex items-center justify-center border border-cream px-6 py-3 text-sm text-cream transition-colors duration-150 hover:border-court hover:text-court"
            >
              Browse clubs
            </Link>
            <Link
              href="/play/open"
              className="inline-flex items-center justify-center border border-brass px-6 py-3 text-sm text-brass transition-colors duration-150 hover:bg-brass hover:text-ink-deep"
            >
              Open matches near you
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-[107px] md:grid-cols-3">
          {cities.map((c) => (
            <Link
              key={c.name}
              href={`/play/clubs?city=${encodeURIComponent(c.name)}&countryCode=${c.country}`}
              className="group flex flex-col gap-4 border border-ink-deep/15 bg-paper p-8 transition-colors duration-150 hover:border-court"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                {c.country}
              </p>
              <h2 className="font-serif text-3xl tracking-tight text-ink-deep group-hover:text-court">
                {c.name}
              </h2>
              <p className="text-sm leading-relaxed text-ink-deep/70">
                {c.blurb}
              </p>
              <span className="mt-auto text-sm text-ink-deep underline-offset-4 group-hover:text-court group-hover:underline">
                View clubs
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
