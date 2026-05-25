import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Padel Court Types Explained: Panoramic, Semi-Panoramic, Standard, and Indoor — Feera Courts',
  description:
    'Complete guide to padel court configurations. Full panoramic ($45-80K), semi-panoramic ($38-65K), standard classic ($30-50K), and indoor enclosed ($60-100K+). How to choose the right type for your climate, budget, and use case.',
  openGraph: {
    title: 'Padel Court Types Explained',
    description:
      'Full panoramic, semi-panoramic, standard, and indoor. Costs, specs, and how to choose for your facility.',
    url: 'https://www.feera.ai/courts/guides/padel-court-types-explained',
    siteName: 'Feera',
    type: 'article',
  },
};

const COURT_TYPES = [
  {
    name: 'Full panoramic',
    price: '$45,000 - $80,000',
    glass: '12mm tempered (ANSI Z97.1 / ASTM C1048)',
    steel: 'Hot-dip galvanized S275JR, 3mm minimum',
    visibility: '360-degree unobstructed',
    bestFor: 'Tournament venues, broadcast facilities, premium clubs',
    description: 'The full panoramic court has all-glass walls with no vertical pillars between panels. Glass is bonded or held by minimal top-and-bottom channel profiles, creating an uninterrupted view from every angle. This is the configuration used in Premier Padel and World Padel Tour events.',
    details: 'The absence of posts means the glass panels must be thicker (12mm minimum) and the engineering tolerances are tighter. Each glass panel is independently tempered and meets ANSI Z97.1 safety standards. If a panel breaks, it crumbles into small granules rather than sharp shards. Replacement panels can be swapped individually without disassembling the court.',
    considerations: 'Full panoramic courts cost 20-40% more than standard classic. The premium is justified for facilities that host tournaments, stream matches, or position themselves as premium destinations. For a commercial club focused on daily bookings and memberships, the visibility difference between full panoramic and semi-panoramic is marginal from a player experience standpoint.',
  },
  {
    name: 'Semi-panoramic',
    price: '$38,000 - $65,000',
    glass: '12mm tempered',
    steel: 'Hot-dip galvanized, corner posts retained',
    visibility: 'Open back walls, corner posts',
    bestFor: 'Commercial clubs, mid-tier facilities, best value',
    description: 'The semi-panoramic retains corner posts and sometimes center-back posts, but removes the posts from the glass back walls. The result is wide, uninterrupted glass panels at the back of the court (where most spectator viewing happens) with structural reinforcement at the corners.',
    details: 'This is the most popular configuration for commercial clubs worldwide. The corner posts add structural rigidity, which means the glass can be slightly thinner in some designs (though most quality manufacturers still use 12mm). The posts also provide anchor points for accessories like camera mounts, scoreboards, and advertising frames.',
    considerations: 'Semi-panoramic offers the best cost-to-aesthetics ratio for commercial clubs. Players inside the court experience virtually the same playing surface as a full panoramic. Spectators get clear sight lines through the back walls. The corner posts are a minor visual element that most players and spectators do not notice during play. For clubs building 4+ courts, the savings of $7,000-$15,000 per court vs full panoramic adds up to $28,000-$60,000 on a 4-court project.',
  },
  {
    name: 'Standard classic',
    price: '$30,000 - $50,000',
    glass: '10mm tempered (minimum)',
    steel: 'Hot-dip galvanized, posts between all panels',
    visibility: 'Posts between panels, mesh upper walls',
    bestFor: 'Private clubs, budget-conscious builds, high-wind areas',
    description: 'The standard classic has vertical metal posts between every glass panel. The upper walls are typically mesh or metallic fencing. This is the original padel court design and remains the most common configuration globally, particularly in Spain, Argentina, and Mexico.',
    details: 'The posts provide maximum structural integrity. Each glass panel is independently framed, which means a broken panel can be replaced without affecting adjacent panels. The post-and-panel system also handles wind loads better than post-less designs, making it the preferred choice for outdoor installations in exposed locations.',
    considerations: 'Standard classic courts deliver the same FIP-compliant playing surface as panoramic or semi-panoramic. The dimensions, net height, turf, and sand infill are identical. The difference is purely aesthetic and structural. For a club where the primary revenue comes from hourly bookings and memberships (not tournaments or streaming), standard classic courts are the most cost-effective option. At $30-50K per court, a 4-court standard classic facility costs $120-200K in court hardware alone, vs $180-320K for full panoramic.',
  },
  {
    name: 'Indoor enclosed',
    price: '$60,000 - $100,000+',
    glass: '10-12mm tempered',
    steel: 'Hot-dip galvanized, integrated with building structure',
    visibility: 'Varies by building design',
    bestFor: 'Cold climates, year-round operation, Canadian market',
    description: 'Indoor enclosed refers to a padel court installed within a permanent building (pre-engineered steel, converted warehouse, or purpose-built facility) or under a temporary structure (air dome, tensioned fabric). The court itself can be any of the three configurations above. The "indoor" designation refers to the building, not the court design.',
    details: 'The building shell adds significant cost. A pre-engineered steel building runs $80-150 per square foot. An air dome runs $40-80 per square foot. For a 4-court facility requiring approximately 14,500 sq ft, the building adds $580,000 to $2.2 million on top of the court hardware. However, indoor facilities in cold climates (Michigan, Ontario, the Northeast) operate 12 months per year vs 7-8 months for outdoor, recovering approximately $280,000 per year in additional revenue for a 4-court club.',
    considerations: 'Minimum clear height is 8m (26 ft) for commercial play, 6m (20 ft) absolute minimum for recreational. Lighting requirements increase indoors because you cannot supplement with natural light. HVAC is a meaningful ongoing cost: $2,000-$5,000/month for heating in winter, $1,500-$3,000/month for cooling in summer. Noise management is important: padel is loud (ball strikes against glass), and indoor acoustics amplify this. Acoustic panels cost $3-8 per square foot installed.',
  },
];

const MINI_COURT = {
  name: 'Mini / junior courts',
  dimensions: '10m x 5m (half-size)',
  price: '$15,000 - $30,000',
  description: 'Half-size courts designed for children, beginners, and schools. The playing surface is exactly half of a standard court. The glass heights are reduced (2.5m vs 3m back wall, 3m vs 4m side wall at the back). These courts are not FIP-compliant for competition but are excellent for programming: junior academies, school partnerships, beginner clinics, and birthday parties.',
  bestFor: 'Schools, junior academies, taster programs, facilities with limited footprint',
};

const DECISION_MATRIX = [
  { factor: 'Tournament hosting', panoramic: 'Required', semiPanoramic: 'Acceptable', standard: 'Not ideal', indoor: 'Depends on court type inside' },
  { factor: 'Streaming / broadcast', panoramic: 'Best', semiPanoramic: 'Good', standard: 'Limited', indoor: 'Depends on lighting' },
  { factor: 'Daily commercial bookings', panoramic: 'Overkill', semiPanoramic: 'Best value', standard: 'Excellent', indoor: 'Essential in cold climates' },
  { factor: 'Budget under $200K (4 courts)', panoramic: 'No', semiPanoramic: 'Tight', standard: 'Yes', indoor: 'No' },
  { factor: 'High-wind outdoor sites', panoramic: 'Risk', semiPanoramic: 'Acceptable', standard: 'Best', indoor: 'N/A' },
  { factor: 'Cold climate (< 5 months outdoor)', panoramic: 'N/A alone', semiPanoramic: 'N/A alone', standard: 'N/A alone', indoor: 'Required' },
  { factor: 'Investor presentation', panoramic: 'Best optics', semiPanoramic: 'Strong', standard: 'Adequate', indoor: 'Required for Canada' },
];

const TOC = [
  { id: 'full-panoramic', label: 'Full panoramic' },
  { id: 'semi-panoramic', label: 'Semi-panoramic' },
  { id: 'standard-classic', label: 'Standard classic' },
  { id: 'indoor-enclosed', label: 'Indoor enclosed' },
  { id: 'mini-courts', label: 'Mini / junior courts' },
  { id: 'how-to-choose', label: 'How to choose' },
];

export default function CourtTypesPage() {
  return (
    <div
      className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      style={{ viewTransitionName: 'feera-root' }}
    >
      {/* Nav */}
      <header className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/" className="feera-motion font-serif text-2xl tracking-tight text-[color:var(--color-fg)]">feera</Link>
            <span className="text-[color:var(--color-fg-muted)]">/</span>
            <Link href="/courts" className="feera-motion text-sm text-[color:var(--color-fg-muted)] hover:text-court">Courts</Link>
            <span className="text-[color:var(--color-fg-muted)]">/</span>
            <Link href="/courts/guides" className="feera-motion text-sm text-[color:var(--color-fg-muted)] hover:text-court">Guides</Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/courts/about" className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]">About</Link>
            <Link href="/courts/partners" className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]">Partners</Link>
            <Link href="/courts/work" className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]">Our Work</Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">Guide</p>
          <h1 className="mt-6 max-w-[28ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            Padel court types explained.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Panoramic, semi-panoramic, standard classic, and indoor enclosed.
            What each configuration costs, how it performs, and which one fits
            your project.
          </p>
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">5 min read</p>
        </div>
      </section>

      {/* Content with TOC */}
      <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-col gap-24">

            {/* Court type sections */}
            {COURT_TYPES.map((court, idx) => {
              const ids = ['full-panoramic', 'semi-panoramic', 'standard-classic', 'indoor-enclosed'];
              const themes = idx % 2 === 0 ? '' : '';
              return (
                <div key={court.name} id={ids[idx]}>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Type {idx + 1}</p>
                  <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{court.name}.</h2>
                  <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{court.description}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{court.details}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{court.considerations}</p>

                  <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="border border-[color:var(--color-border)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Price range</p>
                      <p className="mt-2 text-sm font-medium text-court">{court.price}</p>
                    </div>
                    <div className="border border-[color:var(--color-border)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Glass</p>
                      <p className="mt-2 text-sm">{court.glass}</p>
                    </div>
                    <div className="border border-[color:var(--color-border)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Visibility</p>
                      <p className="mt-2 text-sm">{court.visibility}</p>
                    </div>
                    <div className="border border-[color:var(--color-border)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Best for</p>
                      <p className="mt-2 text-sm">{court.bestFor}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mini courts */}
            <div id="mini-courts">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Type 5</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Mini / junior courts.</h2>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{MINI_COURT.description}</p>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Dimensions</p>
                  <p className="mt-2 text-sm font-medium">{MINI_COURT.dimensions}</p>
                </div>
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Price range</p>
                  <p className="mt-2 text-sm font-medium text-court">{MINI_COURT.price}</p>
                </div>
                <div className="border border-[color:var(--color-border)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Best for</p>
                  <p className="mt-2 text-sm">{MINI_COURT.bestFor}</p>
                </div>
              </div>
            </div>

            {/* Decision matrix */}
            <div id="how-to-choose">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Decision framework</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">How to choose.</h2>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                The right court type depends on four variables: budget, climate, primary use case, and
                investor expectations. Use this decision matrix to narrow down your choice.
              </p>

              <div className="mt-12 overflow-x-auto">
                <table className="w-full min-w-[700px] text-start">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)]">
                      <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Factor</th>
                      <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Panoramic</th>
                      <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Semi-panoramic</th>
                      <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Standard</th>
                      <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Indoor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DECISION_MATRIX.map((row, i) => (
                      <tr key={i} className="border-b border-[color:var(--color-border)]">
                        <td className="py-4 pe-4 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">{row.factor}</td>
                        <td className="py-4 text-sm">{row.panoramic}</td>
                        <td className="py-4 text-sm">{row.semiPanoramic}</td>
                        <td className="py-4 text-sm">{row.standard}</td>
                        <td className="py-4 text-sm">{row.indoor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="border border-court p-8">
                  <h3 className="font-serif text-xl tracking-tight">Our recommendation for most commercial clubs:</h3>
                  <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                    Semi-panoramic courts inside a permanent building (cold climates) or outdoor with
                    seasonal dome option (moderate climates). This configuration offers the best balance
                    of aesthetics, cost, and structural durability. Reserve full panoramic for one
                    showcase court if your budget allows.
                  </p>
                </div>
                <div className="border border-[color:var(--color-border)] p-8">
                  <h3 className="font-serif text-xl tracking-tight">The cost math:</h3>
                  <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                    A 4-court facility with 3 semi-panoramic + 1 panoramic showcase court costs
                    approximately $159,000-$275,000 in court hardware. The same facility with all
                    panoramic courts costs $180,000-$320,000. The $21,000-$45,000 savings on the
                    semi-panoramic approach can fund your booking system, access control, or first
                    3 months of marketing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-court">On this page</p>
              {TOC.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="feera-motion text-xs leading-relaxed text-[color:var(--color-fg-muted)] hover:text-court">
                  {item.label}
                </a>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* CTA */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">Next step</p>
          <h2 className="mx-auto mt-4 max-w-[24ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Configure your courts.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Select your court type, quantity, and amenities in the Feera Courts
            configurator. Get a preliminary estimate in under a minute.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts/configure"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Open court configurator
            </Link>
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-court hover:text-court"
            >
              Request a feasibility study
            </Link>
          </div>
        </div>
      </section>

      {/* Prev/Next */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto flex max-w-[1280px] items-stretch">
          <div className="flex-1 border-e border-[color:var(--color-border)] px-6 py-8">
            <Link href="/courts/guides/detroit-vs-windsor-padel" className="feera-motion group flex flex-col gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">&larr; Previous guide</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Detroit vs Windsor</span>
            </Link>
          </div>
          <div className="flex-1 px-6 py-8 text-end">
            <Link href="/courts/guides/padel-club-roi" className="feera-motion group flex flex-col items-end gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Next guide &rarr;</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Padel club ROI</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Link href="/" className="font-serif text-xl text-[color:var(--color-fg)]">feera</Link>
            <p className="text-xs text-[color:var(--color-fg-muted)]">Feera Courts is a division of Feera.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] md:grid-cols-4">
            <Link href="/courts" className="feera-motion hover:text-[color:var(--color-accent)]">Courts</Link>
            <Link href="/courts/about" className="feera-motion hover:text-[color:var(--color-accent)]">About</Link>
            <Link href="/courts/partners" className="feera-motion hover:text-[color:var(--color-accent)]">Partners</Link>
            <Link href="/courts/work" className="feera-motion hover:text-[color:var(--color-accent)]">Our Work</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
