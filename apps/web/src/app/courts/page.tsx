import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuoteForm } from './quote-form';

export const metadata: Metadata = {
  title: 'Feera Courts — Padel Court Consultancy for North America',
  description:
    'End-to-end padel court design, sourcing, and installation consultancy for clubs across Canada and the United States. From site assessment to first serve.',
};

const COURT_TYPES = [
  {
    name: 'Full Panoramic',
    description:
      'All-glass walls with no vertical pillars. Unobstructed 360-degree visibility. Preferred for tournaments, streaming, and premium facilities.',
    priceRange: '$45,000 - $80,000',
    glass: '12mm tempered',
    bestFor: 'Competition venues, premium clubs',
  },
  {
    name: 'Semi-Panoramic',
    description:
      'Glass back walls without pillars, steel corner posts retained. Best balance of visibility and cost for commercial clubs.',
    priceRange: '$38,000 - $65,000',
    glass: '12mm tempered',
    bestFor: 'Commercial clubs, mid-tier facilities',
  },
  {
    name: 'Standard Classic',
    description:
      'Vertical metal posts between every glass panel. Most robust and cost-effective design for high-wind areas and budget builds.',
    priceRange: '$30,000 - $50,000',
    glass: '10mm tempered',
    bestFor: 'Private clubs, budget builds, exposed sites',
  },
  {
    name: 'Indoor Enclosed',
    description:
      'Full court within a steel building or air dome. Essential for Canadian winters. Minimum 8m clear height for commercial play.',
    priceRange: '$60,000 - $100,000+',
    glass: '10-12mm tempered',
    bestFor: 'Cold climates, year-round operation',
  },
];

const AMENITIES = [
  {
    category: 'Player facilities',
    items: [
      { name: 'Locker rooms and showers', cost: '$40,000 - $120,000' },
      { name: 'Pro shop and retail', cost: '$15,000 - $40,000' },
      { name: 'Clubhouse and lounge', cost: '$30,000 - $100,000' },
      { name: 'Bar, cafe, or food service', cost: '$50,000 - $150,000' },
    ],
  },
  {
    category: 'Technology',
    items: [
      { name: 'Court booking system (Feera)', cost: 'Included' },
      { name: 'Access control (app-based entry)', cost: '$5,000 - $20,000' },
      { name: 'Camera system (AI highlights)', cost: '$1,650 - $15,000/court' },
      { name: 'Electronic scoreboards', cost: '$200 - $5,000/court' },
    ],
  },
  {
    category: 'Operations',
    items: [
      { name: 'LED lighting system (500 lux)', cost: '$2,800 - $10,000/court' },
      { name: 'Ball machines', cost: '$500 - $5,000' },
      { name: 'Wi-Fi infrastructure', cost: '$3,000 - $8,000' },
      { name: 'Digital signage and screens', cost: '$5,000 - $20,000' },
    ],
  },
  {
    category: 'Sustainability',
    items: [
      { name: 'Solar canopy (per court roof)', cost: '$70,000 - $160,000' },
      { name: 'Rainwater harvesting', cost: '$3,000 - $10,000' },
      { name: 'Eco-friendly turf (recycled)', cost: 'Minimal premium' },
      { name: 'LED vs halogen (50-75% savings)', cost: 'Standard' },
    ],
  },
];

const FACILITY_SIZES = [
  {
    courts: 2,
    outdoor: '$150K - $250K',
    indoor: '$300K - $500K',
    footprint: '~530 sqm',
    parking: '10-16 spaces',
  },
  {
    courts: 4,
    outdoor: '$250K - $600K',
    indoor: '$500K - $1.5M',
    footprint: '~1,344 sqm',
    parking: '20-32 spaces',
  },
  {
    courts: 8,
    outdoor: '$500K - $1.2M',
    indoor: '$1M - $3M+',
    footprint: '~3,000 sqm',
    parking: '40-64 spaces',
  },
];

const SPECS = [
  { label: 'Court dimensions', value: '20m x 10m (FIP standard)' },
  { label: 'Minimum footprint', value: '22m x 12m with buffers' },
  { label: 'Clear height', value: '8m commercial, 6m minimum' },
  { label: 'Foundation', value: '15-25cm reinforced, air-entrained for freeze-thaw' },
  { label: 'Glass', value: '10-12mm tempered safety (ANSI Z97.1)' },
  { label: 'Steel', value: 'Hot-dip galvanized S275JR, 3mm minimum' },
  { label: 'Turf pile height', value: '10-15mm PE+PP monofilament' },
  { label: 'Sand infill', value: '17-22 kg/sqm silica, 0.2-0.5mm grain' },
  { label: 'Lighting', value: '500 lux competition, 4000-6000K, CRI 80+' },
  { label: 'Net height', value: '88cm center, 92cm at posts' },
];

const ROI_DATA = [
  { label: 'Year 1 revenue (4-court)', value: '~$675,000' },
  { label: 'Operational breakeven', value: '~14 months' },
  { label: 'Capital payback', value: '24-56 months' },
  { label: 'Stabilized EBITDA margin', value: '30-35%' },
  { label: 'Stabilized owner income', value: '$100K-$250K/year' },
  { label: 'U.S. market growth', value: '11.1% CAGR to $267M by 2030' },
];

const MONTHLY_OPS = [
  { item: 'Facility lease', cost: '$15,000' },
  { item: 'Staff wages (6.5 FTE)', cost: '$23,700' },
  { item: 'Utilities', cost: '$3,500' },
  { item: 'Insurance', cost: '$1,200' },
  { item: 'Software', cost: '$800' },
  { item: 'Maintenance', cost: '$800 - $1,600' },
  { item: 'Marketing', cost: '$1,000 - $3,000' },
];

export default function CourtsPage() {
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
              href="/"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Home
            </Link>
            <Link
              href="/clubs"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Clubs
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col items-start justify-center px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Feera Courts
          </p>
          <h1 className="mt-6 max-w-[20ch] font-serif text-6xl font-normal leading-none tracking-[-0.02em] md:text-7xl">
            Build your padel club. From blueprint to first serve.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            End-to-end padel court consultancy for North America. We handle
            supplier sourcing, court configuration, facility design, permitting
            guidance, and installation coordination across Canada and the United
            States.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/courts/configure"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Open court configurator
            </Link>
            <a
              href="#quote"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-court hover:text-court"
            >
              Get a free consultation
            </a>
          </div>
        </div>
      </section>

      {/* Credibility strip */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-[color:var(--color-border)] px-6 md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            'FIP-compliant specs',
            'Vetted global suppliers',
            'Canada + USA coverage',
            'Feera booking included',
          ].map((item) => (
            <div
              key={item}
              className="px-6 py-10 text-center text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            What we do
          </p>
          <h2 className="mt-4 max-w-[24ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Everything between the idea and the opening day.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                title: 'Site assessment',
                body: 'Zoning analysis, orientation study, foundation engineering, and permit roadmapping for your specific municipality.',
              },
              {
                title: 'Court configuration',
                body: 'Choose court type, glass spec, turf, lighting, and layout. We model 2-court to 8-court facilities with shared walls and spectator flow.',
              },
              {
                title: 'Supplier sourcing',
                body: 'We work with vetted manufacturers in Spain, Italy, and China. Factory QC, shipping logistics, customs, and landed-cost optimization.',
              },
              {
                title: 'Facility design',
                body: 'Clubhouse, locker rooms, pro shop, bar, viewing gallery, parking. Full amenity planning with cost modeling.',
              },
              {
                title: 'Technology stack',
                body: 'Feera booking platform, access control, camera systems, scoreboards, Wi-Fi, and digital signage. Turnkey tech.',
              },
              {
                title: 'Financial modeling',
                body: 'Revenue projections, operating cost breakdown, ROI timeline, membership pricing strategy, and sponsorship revenue planning.',
              },
            ].map((service) => (
              <article
                key={service.title}
                className="feera-motion group flex flex-col gap-4"
              >
                <div
                  aria-hidden
                  className="feera-motion aspect-[4/3] w-full border border-[color:var(--color-border)] group-hover:border-court"
                />
                <h3 className="font-serif text-2xl tracking-tight">
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {service.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Court types */}
      <section
        id="court-types"
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Court types
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Four configurations. One standard.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Every court we source meets FIP (International Padel Federation)
            dimensional and safety standards. All glass is tempered to ANSI Z97.1
            or ASTM C1048. All steel is hot-dip galvanized.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            {COURT_TYPES.map((court) => (
              <article
                key={court.name}
                className="feera-motion flex flex-col gap-4 border border-[color:var(--color-border)] p-8 hover:border-court"
              >
                <h3 className="font-serif text-3xl tracking-tight">
                  {court.name}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {court.description}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-4 border-t border-[color:var(--color-border)] pt-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Installed
                    </p>
                    <p className="mt-1 text-sm font-medium text-court">
                      {court.priceRange}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Glass
                    </p>
                    <p className="mt-1 text-sm">{court.glass}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Best for
                    </p>
                    <p className="mt-1 text-sm">{court.bestFor}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Technical specs */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Technical specifications
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            FIP-compliant. Down to the millimeter.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-2">
            {SPECS.map((spec, i) => (
              <div
                key={spec.label}
                className={`flex items-baseline justify-between border-b border-[color:var(--color-border)] px-4 py-5 ${
                  i % 2 === 0 ? 'md:border-e md:border-e-[color:var(--color-border)]' : ''
                }`}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                  {spec.label}
                </span>
                <span className="text-end text-sm font-medium">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facility sizing */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Facility sizing
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            From two courts to eight. We model every size.
          </h2>
          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[600px] text-start">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Courts
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Outdoor
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Indoor
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Footprint
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Parking
                  </th>
                </tr>
              </thead>
              <tbody>
                {FACILITY_SIZES.map((row) => (
                  <tr
                    key={row.courts}
                    className="border-b border-[color:var(--color-border)]"
                  >
                    <td className="py-5 font-serif text-2xl">{row.courts}</td>
                    <td className="py-5 text-sm text-court">{row.outdoor}</td>
                    <td className="py-5 text-sm text-court">{row.indoor}</td>
                    <td className="py-5 text-sm text-[color:var(--color-fg-muted)]">
                      {row.footprint}
                    </td>
                    <td className="py-5 text-sm text-[color:var(--color-fg-muted)]">
                      {row.parking}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
            Prices include courts, basic amenities (locker rooms, reception,
            clubhouse), foundation, and installation. Exclude land acquisition,
            air dome/steel building shell for indoor, and working capital.
          </p>
        </div>
      </section>

      {/* Amenities */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Amenities and add-ons
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Customize every detail.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Every club is different. We help you choose the right amenities for
            your market, budget, and long-term strategy.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
            {AMENITIES.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                  {group.category}
                </h3>
                <div className="mt-6 flex flex-col">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-baseline justify-between border-b border-[color:var(--color-border)] py-4"
                    >
                      <span className="text-sm">{item.name}</span>
                      <span className="text-end text-xs text-[color:var(--color-fg-muted)]">
                        {item.cost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI and operations */}
      <section className="bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Financial outlook
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            The numbers behind the net.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-16 md:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                Revenue and ROI (4-court facility)
              </h3>
              <div className="mt-6 flex flex-col">
                {ROI_DATA.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between border-b border-[color:var(--color-border)] py-4"
                  >
                    <span className="text-sm">{row.label}</span>
                    <span className="text-sm font-medium text-court">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                Monthly operating costs (4-court)
              </h3>
              <div className="mt-6 flex flex-col">
                {MONTHLY_OPS.map((row) => (
                  <div
                    key={row.item}
                    className="flex items-baseline justify-between border-b border-[color:var(--color-border)] py-4"
                  >
                    <span className="text-sm">{row.item}</span>
                    <span className="text-end text-xs text-[color:var(--color-fg-muted)]">
                      {row.cost}
                    </span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between py-4">
                  <span className="text-sm font-medium">Total monthly</span>
                  <span className="text-sm font-medium text-court">
                    ~$46,000 - $49,000
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Climate considerations */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Built for North America
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            From Miami heat to Toronto snow.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: 'Canadian winters',
                body: 'Air-entrained concrete foundations rated for freeze-thaw cycles. Air domes or pre-engineered steel buildings with insulation and radiant heating. Hot-dip galvanized steel resists road salt corrosion.',
              },
              {
                title: 'Hurricane zones',
                body: 'Wind-rated structures to 140-160 mph for Florida, Gulf Coast, and Southeast. 12-14mm reinforced glass. 4mm steel profiles on structural elements.',
              },
              {
                title: 'Permits and codes',
                body: 'We navigate municipal zoning, building permits ($500-$3,000/court), ANSI/ASTM glass standards, ADA accessibility requirements, AODA compliance in Ontario, and noise bylaws.',
              },
            ].map((item) => (
              <article
                key={item.title}
                className="feera-motion flex flex-col gap-4 border border-[color:var(--color-border)] p-8 hover:border-court"
              >
                <h3 className="font-serif text-2xl tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Supplier network */}
      <section className="bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Supplier network
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Vetted manufacturers. Three continents.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We source from the same factories that supply Premier Padel, FIP
            events, and top European clubs. Every supplier is audited for glass
            certification, steel galvanization, and warranty enforcement.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border border-[color:var(--color-border)] p-8">
              <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                European premium
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                MejorSet (Spain, official FIP supplier), Manzasport, Portico
                Sport, Italian Padel (Forgiafer), Mondo. Tier-one quality with
                10-year structural warranties. $38K-$80K per court installed.
              </p>
            </div>
            <div className="border border-[color:var(--color-border)] p-8">
              <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                North American
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Absolute Padel (Pennsylvania, only NA manufacturer), PadelBox
                (MejorSet distributor, 15+ states), All Racquet Sports.
                Eliminates import risk and ocean freight. $20K-$65K per court.
              </p>
            </div>
            <div className="border border-[color:var(--color-border)] p-8">
              <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                Factory-direct (Asia)
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Shandong Century Star, NJQFAN, Shengshi Sports Tech. 20-25%
                savings with third-party QC inspection. 12mm tempered glass,
                CE certified. Best for 4+ court orders. $18K-$30K landed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service tiers */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Engagement models
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Three ways to work with us.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <article className="flex flex-col gap-6 border border-[color:var(--color-border)] p-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                Tier 1
              </p>
              <h3 className="font-serif text-3xl tracking-tight">
                Consultation
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                60-minute deep dive into your project. Site assessment
                checklist, court type recommendation, supplier shortlist, and
                ballpark budget.
              </p>
              <div className="mt-auto">
                <p className="font-serif text-2xl text-court">Free</p>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  No commitment. Introductory call.
                </p>
              </div>
              <p className="text-xs text-[color:var(--color-fg-muted)]">
                Deliverables: site checklist, court type brief, supplier
                shortlist, ballpark cost range.
              </p>
            </article>
            <article className="flex flex-col gap-6 border border-court p-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-court">
                Tier 2 — most popular
              </p>
              <h3 className="font-serif text-3xl tracking-tight">
                Full advisory
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Complete feasibility study, facility design, supplier RFQ
                management, financial modeling, and permit guidance. We stay
                with you through procurement.
              </p>
              <div className="mt-auto">
                <p className="font-serif text-2xl text-court">
                  5% of project cost
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  Minimum $15,000. Capped at $75,000.
                </p>
              </div>
              <p className="text-xs text-[color:var(--color-fg-muted)]">
                Deliverables: feasibility study PDF, pro forma financials, 2D
                layout, supplier comparison matrix, RFQ coordination, permit
                roadmap.
              </p>
            </article>
            <article className="flex flex-col gap-6 border border-[color:var(--color-border)] p-8">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                Tier 3
              </p>
              <h3 className="font-serif text-3xl tracking-tight">Turnkey</h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Everything in Full Advisory plus installation oversight, QA
                inspection, technology deployment, and operational setup. We
                hand you the keys.
              </p>
              <div className="mt-auto">
                <p className="font-serif text-2xl text-court">
                  8% of project cost
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  Minimum $30,000. Includes on-site presence.
                </p>
              </div>
              <p className="text-xs text-[color:var(--color-fg-muted)]">
                Deliverables: all Tier 2 items plus factory QC report,
                installation supervision, Feera platform setup, staff training,
                launch marketing plan.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Timeline
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Idea to opening day.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-6">
            {[
              { phase: 'Consultation', duration: 'Week 1', description: 'Free call, site checklist, court recommendation' },
              { phase: 'Feasibility', duration: 'Weeks 2-4', description: 'Market study, financial model, facility design' },
              { phase: 'Procurement', duration: 'Weeks 4-8', description: 'Supplier RFQ, factory selection, order placement' },
              { phase: 'Site prep', duration: 'Weeks 8-14', description: 'Permits, foundation, drainage, utilities' },
              { phase: 'Installation', duration: 'Weeks 14-16', description: 'Court assembly, turf, lighting, QA' },
              { phase: 'Launch', duration: 'Week 17', description: 'Tech setup, staff training, soft opening' },
            ].map((item, i) => (
              <div
                key={item.phase}
                className="flex flex-col gap-2 border-s-2 border-[color:var(--color-border)] py-6 ps-6 md:border-s-0 md:border-t-2 md:ps-0 md:pt-6"
                style={{
                  borderColor: i === 0 ? 'var(--color-accent, #437E5B)' : undefined,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-court">
                  {item.duration}
                </p>
                <p className="font-serif text-lg tracking-tight">
                  {item.phase}
                </p>
                <p className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-[color:var(--color-fg-muted)]">
            Timeline assumes outdoor courts with existing site. Indoor
            conversions add 2-4 weeks. New builds add 4-8 weeks. Canadian
            permits may vary by municipality.
          </p>
        </div>
      </section>

      {/* Supplier comparison table */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Supplier comparison
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Side by side.
          </h2>
          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[700px] text-start">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  {['Factor', 'European premium', 'North American', 'Factory-direct (Asia)'].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Origin', 'Spain, Italy, Portugal', 'Pennsylvania, USA', 'China (Jiangsu, Shandong, Guangdong)'],
                  ['Price per court', '$34K - $52K (EXW)', '$26K - $40K', '$14K - $22K (EXW)'],
                  ['Landed cost (Detroit)', '$48K - $72K', '$29K - $43K', '$28K - $42K'],
                  ['Landed cost (Windsor)', '$42K - $62K (CETA)', '$30K - $44K', '$30K - $46K (+25% surtax)'],
                  ['Glass spec', '12mm tempered (ASTM C1048)', '10-12mm tempered', '12mm tempered (EN12150-2)'],
                  ['Steel', 'S275JR hot-dip galvanized', 'Varies by model', 'Q235 or S275JR, hot-dip galvanized'],
                  ['Warranty', '10 years structure, 7 years turf', '5-10 years', '5-8 years'],
                  ['Certifications', 'FIP, CE, Florida Building Code', 'ASTM, local codes', 'CE, CCC (verify per factory)'],
                  ['Lead time', '6-10 weeks', '4-8 weeks', '8-14 weeks'],
                  ['Installation', 'Distributor crews (PadelBox)', 'In-house network (150+ installers)', 'Local contractor needed'],
                  ['QC risk', 'Low', 'Low', 'Medium (third-party inspection recommended)'],
                  ['Best for', 'Tournament venues, premium clubs', 'Budget-conscious, fast timeline', '4+ court orders, cost optimization'],
                ].map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[color:var(--color-border)]"
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`py-4 pe-4 ${j === 0 ? 'text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]' : ''}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            FAQ
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Common questions.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
            {[
              {
                q: 'How long does the entire process take?',
                a: 'Typical outdoor project: 14-17 weeks from consultation to opening. Indoor conversions add 2-4 weeks. New steel buildings add 4-8 weeks. Canadian projects may have longer permit timelines depending on municipality.',
              },
              {
                q: 'What permits do I need?',
                a: 'Building permit (commercial), zoning verification (recreation use), structural engineering stamp, and inspections. In Ontario, AODA compliance is mandatory. In Michigan, BSEED handles permits (4-9 month timeline). We handle the roadmap for you.',
              },
              {
                q: 'Can I phase the build?',
                a: 'Yes. Many clubs start with 2-4 courts and expand later. Shared-wall designs allow adding adjacent courts without demolishing existing ones. Foundation can be poured for future courts from day one at minimal extra cost.',
              },
              {
                q: 'Do you handle ongoing maintenance?',
                a: 'Our Turnkey tier includes operational setup and maintenance planning. Turf lasts 4-7 years, glass is indefinite (replace individual panels if cracked), and LED lighting lasts 5-10 years. Annual maintenance budget: $2,000-$6,000 per court.',
              },
              {
                q: 'Why is Windsor cheaper for EU courts?',
                a: 'CETA (Canada-EU free trade agreement) eliminates import duties on EU-origin padel courts. The US has no equivalent agreement, adding 10% baseline + 25% steel tariff. For a 4-court EU order, this saves $20,000-$40,000.',
              },
              {
                q: 'What about the booking system?',
                a: 'Every Feera Courts project includes the Feera booking platform at no additional cost. Players book courts, join open matches, and manage memberships through the same app used across all Feera clubs.',
              },
              {
                q: 'Do you compete with Zmash in Detroit?',
                a: 'Zmash is a club operator. We are a consultancy. We help you build your own club. That said, we track the competitive landscape and factor existing facilities into our feasibility studies.',
              },
              {
                q: 'What is the minimum viable investment?',
                a: '2 outdoor courts with basic amenities in a favorable location: approximately $150,000-$250,000 USD (Detroit) or $200,000-$350,000 CAD (Windsor). Indoor minimum is roughly double.',
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="font-serif text-lg tracking-tight">
                  {faq.q}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section
        id="quote"
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_400px]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-court">
                Get started
              </p>
              <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
                Tell us about your project.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
                Free initial consultation. We will assess your site, recommend
                court configurations, model costs, and connect you with the
                right suppliers for your market and budget.
              </p>
              <div className="mt-12 flex flex-col gap-6">
                {[
                  '1. Free 30-minute consultation call',
                  '2. Site assessment and feasibility report',
                  '3. Custom facility design and cost model',
                  '4. Supplier introductions and RFQ coordination',
                  '5. Installation oversight and quality assurance',
                ].map((step) => (
                  <p
                    key={step}
                    className="text-sm text-[color:var(--color-fg-muted)]"
                  >
                    {step}
                  </p>
                ))}
              </div>
            </div>
            <QuoteForm />
          </div>
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
              Feera Courts is a division of Feera.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] md:grid-cols-4">
            <Link
              href="/"
              className="feera-motion hover:text-[color:var(--color-accent)]"
            >
              Home
            </Link>
            <Link
              href="/clubs"
              className="feera-motion hover:text-[color:var(--color-accent)]"
            >
              Clubs
            </Link>
            <Link
              href="/privacy"
              className="feera-motion hover:text-[color:var(--color-accent)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="feera-motion hover:text-[color:var(--color-accent)]"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
