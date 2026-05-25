import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'How Much Does a Padel Court Cost in 2026? — Feera Courts',
  description:
    'Complete 2026 padel court cost breakdown: structure ($15-52K), turf ($5.5-14.5K), lighting ($2.8-15K), foundation ($8-18K), shipping, installation, and hidden costs. Per-court and full-project budgets for North America.',
  openGraph: {
    title: 'How Much Does a Padel Court Cost in 2026?',
    description:
      'Complete per-court cost breakdown and full-project budgets for 2, 4, and 8-court padel facilities in the US and Canada.',
    url: 'https://www.feera.ai/courts/guides/padel-court-cost-2026',
    siteName: 'Feera',
    type: 'article',
  },
};

const COST_BREAKDOWN = [
  { item: 'Court structure (steel + glass)', range: '$15,000 - $52,000', note: 'Varies by supplier origin: factory-direct Asia ($15-22K), North American ($26-40K), European premium ($34-52K). Includes frame, posts, glass panels, mesh walls, and net system.' },
  { item: 'Artificial turf + sand infill', range: '$5,500 - $14,500', note: '10-15mm PE+PP monofilament pile. Silica sand infill at 17-22 kg/sqm. FIP-spec turf with UV stabilization. Price varies by manufacturer and whether you source factory-direct or through a distributor.' },
  { item: 'LED lighting system', range: '$2,800 - $15,000', note: '500 lux minimum for competition play. 4000-6000K color temperature, CRI 80+. Basic LED arrays start at $2,800. Broadcast-grade lighting with individual court dimming runs $10-15K.' },
  { item: 'Concrete foundation', range: '$8,000 - $18,000', note: '15-25cm reinforced concrete with drainage. Air-entrained mix required in freeze-thaw climates (Michigan, Ontario). Includes sub-base preparation, forms, rebar, and finish.' },
  { item: 'Shipping and freight', range: '$3,000 - $22,000', note: 'Domestic (North American supplier): $3-5K per court. Ocean freight from Europe: $8-14K per container (fits 2 courts). From China: $10-22K with longer transit times.' },
  { item: 'Installation labor', range: '$8,000 - $12,000', note: '3-5 days per court with an experienced crew. Includes court assembly, glass installation, turf laying, sand infill, net tensioning, and lighting wiring. Rates vary by region.' },
];

const PROJECT_COSTS = [
  { courts: '2-court facility', outdoor: '$150,000 - $250,000', indoor: '$300,000 - $500,000', note: 'Minimum viable club. Often a test market or neighborhood facility. Shared walls reduce per-court cost by ~$3,000.' },
  { courts: '4-court facility', outdoor: '$250,000 - $600,000', indoor: '$500,000 - $1,500,000', note: 'The commercial sweet spot. Supports leagues, coaching programs, and memberships. Most feasibility studies model 4 courts.' },
  { courts: '8-court facility', outdoor: '$500,000 - $1,200,000', indoor: '$1,000,000 - $3,000,000+', note: 'Regional destination club. Tournament hosting, multiple simultaneous programs. Requires 3,000+ sqm footprint and 40-64 parking spaces.' },
];

const HIDDEN_COSTS = [
  { item: 'Building permits', range: '$2,000 - $10,000', note: 'Michigan BSEED permits can take 4-9 months. Ontario municipal permits are typically faster. Budget $500-$3,000 per court in permit fees alone.' },
  { item: 'Structural engineering', range: '$3,000 - $8,000', note: 'Engineer-stamped foundation drawings are required for commercial construction in both the US and Canada. Wind load calculations needed for outdoor courts.' },
  { item: 'Zoning and land use', range: '$1,000 - $5,000', note: 'Zoning verification for recreational use. Some municipalities require conditional use permits or variance hearings, which add time and legal costs.' },
  { item: 'Insurance (annual)', range: '$12,000 - $40,000/year', note: 'General liability, property, and professional liability. Glass breakage riders add $2-5K/year. Rates are higher for indoor facilities due to fire code requirements.' },
  { item: 'ADA / AODA compliance', range: '$5,000 - $25,000', note: 'Accessible pathways, ramps, door widths, restroom modifications. AODA compliance is mandatory in Ontario. ADA applies to all US commercial facilities.' },
  { item: 'Site drainage', range: '$3,000 - $15,000', note: 'Outdoor courts need proper grading and drainage to prevent standing water. French drains, catch basins, or permeable sub-base, depending on soil conditions and local code.' },
];

const TOC = [
  { id: 'per-court-breakdown', label: 'Per-court cost breakdown' },
  { id: 'total-project-costs', label: 'Total project costs' },
  { id: 'indoor-vs-outdoor', label: 'Indoor vs outdoor' },
  { id: 'supplier-tiers', label: 'Factory-direct vs European vs NA' },
  { id: 'hidden-costs', label: 'Hidden costs' },
  { id: 'reduce-costs', label: 'How to reduce costs' },
];

export default function PadelCourtCostPage() {
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
            How much does a padel court cost in 2026?
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            A complete cost breakdown for padel court construction in North
            America. Per-court hardware, site preparation, installation, and the
            hidden costs most operators overlook. Updated for 2026 pricing.
          </p>
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">8 min read</p>
        </div>
      </section>

      {/* Content with TOC sidebar */}
      <section data-theme="light" className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
            {/* Main content */}
            <div className="flex flex-col gap-24">

              {/* Per-court breakdown */}
              <div id="per-court-breakdown">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 1</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Per-court cost breakdown.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The per-court cost is the foundation of every padel project budget. It includes six
                  major line items: the court structure itself (steel frame and glass), artificial turf
                  with sand infill, LED lighting, concrete foundation, shipping/freight, and installation
                  labor. Depending on supplier origin and project specifications, a single court ranges
                  from $42,300 at the low end to $133,500 at the high end, fully installed.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The mid-range benchmark we use at Feera Courts for feasibility studies is $215,000 all-in
                  per court, which includes FIP-spec hardware, site fit-out (foundation, drainage, lighting,
                  turf), and project management. That figure reflects mid-range European or North American
                  supply at 2026 pricing and is the number we underwrite against.
                </p>

                <div className="mt-12 flex flex-col">
                  {COST_BREAKDOWN.map((row, i) => (
                    <div key={i} className="border-b border-[color:var(--color-border)] py-6">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">{row.item}</span>
                        <span className="text-sm font-medium text-court">{row.range}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{row.note}</p>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between border-b-2 border-court py-6">
                    <span className="text-sm font-medium">Total per court (installed)</span>
                    <span className="text-sm font-medium text-court">$42,300 - $133,500</span>
                  </div>
                </div>

                <p className="mt-8 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                  Sources: Feera Courts project database (2024-2026), supplier quotes from MejorSet,
                  Absolute Padel, PadelBox, Shandong Century Star. Prices in USD unless noted.
                </p>
              </div>

              {/* Total project costs */}
              <div id="total-project-costs">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 2</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Total project costs.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Total project cost goes beyond per-court hardware. It includes site preparation, amenities
                  (locker rooms, reception, clubhouse), parking, technology (booking system, access control,
                  cameras), and working capital for pre-opening marketing. The ranges below reflect this
                  fully-loaded view.
                </p>

                <div className="mt-12 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-start">
                    <thead>
                      <tr className="border-b border-[color:var(--color-border)]">
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Configuration</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Outdoor</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Indoor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PROJECT_COSTS.map((row, i) => (
                        <tr key={i} className="border-b border-[color:var(--color-border)]">
                          <td className="py-5 font-serif text-lg">{row.courts}</td>
                          <td className="py-5 text-sm text-court">{row.outdoor}</td>
                          <td className="py-5 text-sm text-court">{row.indoor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {PROJECT_COSTS.map((row, i) => (
                  <p key={i} className="mt-4 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                    <span className="font-medium">{row.courts}:</span> {row.note}
                  </p>
                ))}
              </div>

              {/* Indoor vs outdoor */}
              <div id="indoor-vs-outdoor">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 3</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Indoor vs outdoor cost difference.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Indoor facilities cost roughly 2x to 2.5x more than outdoor. The premium comes from the
                  building shell itself: a pre-engineered steel building runs $80-150 per square foot, and
                  an air dome (temporary fabric structure) runs $40-80 per square foot. For a 4-court
                  facility requiring roughly 1,344 sqm (14,500 sq ft) of floor space, the building shell
                  alone adds $580,000 to $2.2 million.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  However, indoor facilities earn more. In cold climates like Michigan and Ontario, outdoor
                  courts sit idle 4-5 months per year. An indoor facility operates 12 months. At $50/hour
                  average booking rate, a 4-court indoor club recovers approximately $280,000 in revenue per
                  year that an outdoor club simply cannot access. Over 5 years, that is $1.4 million in
                  additional revenue, which more than justifies the building shell premium.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The third option is a seasonal approach: outdoor courts with an air dome that can be
                  erected in October and removed in April. This costs $120,000-$250,000 for a 4-court dome
                  and extends the season to 10-11 months. Several operators in the Northeast and Midwest are
                  adopting this model to defer the cost of a permanent building.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                  {[
                    { label: 'Outdoor', months: '7-8 months/year', premium: 'Baseline', best: 'Warm climates, test markets' },
                    { label: 'Seasonal dome', months: '10-11 months/year', premium: '+$120-250K', best: 'Midwest, phased builds' },
                    { label: 'Permanent indoor', months: '12 months/year', premium: '+$580K-2.2M', best: 'Canada, premium clubs' },
                  ].map((opt) => (
                    <div key={opt.label} className="border border-[color:var(--color-border)] p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-court">{opt.label}</p>
                      <p className="mt-4 font-serif text-2xl tracking-tight">{opt.months}</p>
                      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">Cost premium: {opt.premium}</p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">Best for: {opt.best}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier tiers */}
              <div id="supplier-tiers">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 4</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Factory-direct vs European vs North American suppliers.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Supplier selection is the single largest variable in court cost. The same FIP-compliant
                  court, with 12mm tempered glass and hot-dip galvanized steel, can range from $14,000 to
                  $52,000 per unit EXW (before shipping and installation), depending on where it is
                  manufactured.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                  {[
                    {
                      tier: 'Factory-direct (Asia)',
                      price: '$14,000 - $22,000 EXW',
                      landed: '$28,000 - $42,000 landed Detroit',
                      pros: 'Lowest per-unit cost. 20-25% savings over European. Best for 4+ court orders where volume justifies QC inspection trips.',
                      cons: 'Longer lead times (8-14 weeks). Third-party QC inspection strongly recommended ($2-4K). Some factories inconsistent on galvanization quality.',
                      names: 'Shandong Century Star, NJQFAN, Shengshi Sports Tech',
                    },
                    {
                      tier: 'North American',
                      price: '$26,000 - $40,000',
                      landed: '$29,000 - $43,000 landed Detroit',
                      pros: 'Fastest lead time (4-8 weeks). Eliminates import risk and ocean freight. Network of 150+ certified installers. Warranty claims resolved domestically.',
                      cons: 'Limited to one manufacturer (Absolute Padel, Pennsylvania) for domestic production. PadelBox distributes MejorSet (Spain) but acts as a US-based intermediary.',
                      names: 'Absolute Padel, PadelBox (MejorSet distributor)',
                    },
                    {
                      tier: 'European premium',
                      price: '$34,000 - $52,000 EXW',
                      landed: '$48,000 - $72,000 landed Detroit',
                      pros: 'FIP-certified suppliers. 10-year structural warranties. Tournament-grade quality. Strong brand recognition with serious investors.',
                      cons: 'Highest cost. 6-10 week lead times plus ocean freight (4-6 weeks). US tariffs add 10% baseline + 25% steel surcharge. CETA eliminates duties for Canadian imports.',
                      names: 'MejorSet, Manzasport, Portico Sport, Italian Padel (Forgiafer), Mondo',
                    },
                  ].map((tier) => (
                    <div key={tier.tier} className="flex flex-col gap-4 border border-[color:var(--color-border)] p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-court">{tier.tier}</p>
                      <p className="font-serif text-2xl tracking-tight">{tier.price}</p>
                      <p className="text-xs text-[color:var(--color-fg-muted)]">{tier.landed}</p>
                      <div className="border-t border-[color:var(--color-border)] pt-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Advantages</p>
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{tier.pros}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Considerations</p>
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{tier.cons}</p>
                      </div>
                      <p className="mt-auto text-xs text-[color:var(--color-fg-muted)]">{tier.names}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidden costs */}
              <div id="hidden-costs">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 5</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Hidden costs most operators overlook.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The court hardware and installation are the easy numbers. The costs that surprise
                  first-time operators are permits, engineering, insurance, accessibility compliance, and
                  drainage. Together, these can add $26,000 to $103,000 to a project, and they are
                  non-negotiable.
                </p>

                <div className="mt-12 flex flex-col">
                  {HIDDEN_COSTS.map((row, i) => (
                    <div key={i} className="border-b border-[color:var(--color-border)] py-6">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">{row.item}</span>
                        <span className="text-sm font-medium text-court">{row.range}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{row.note}</p>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between border-b-2 border-court py-6">
                    <span className="text-sm font-medium">Total hidden costs</span>
                    <span className="text-sm font-medium text-court">$26,000 - $103,000+</span>
                  </div>
                </div>
              </div>

              {/* How to reduce costs */}
              <div id="reduce-costs">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 6</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">How to reduce costs.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  You cannot cut your way to a profitable padel club. But you can make smart structural
                  decisions that reduce per-court costs by 15-30% without compromising quality or safety.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  {[
                    {
                      title: 'Shared walls',
                      body: 'Adjacent courts that share a common wall save $2,500-$4,000 per shared wall. A 4-court layout with 3 shared walls saves $7,500-$12,000 in materials. Design the layout for shared walls from the start; retrofitting is expensive.',
                    },
                    {
                      title: 'Phased construction',
                      body: 'Start with 2-4 courts. Pour foundations for future courts at the same time (adds $3-5K today, saves $8-12K later). Validate demand before committing to a full 8-court build. Shared-wall designs make expansion straightforward.',
                    },
                    {
                      title: 'CETA for Canadian imports',
                      body: 'If you are building in Ontario, import European courts duty-free under CETA (Canada-EU Comprehensive Economic and Trade Agreement). The US has no equivalent. For a 4-court European order, CETA saves $20,000-$40,000 in duties compared to importing the same courts to Michigan.',
                    },
                    {
                      title: 'Volume orders from Asia',
                      body: 'Factory-direct courts from China cost $14-22K per court EXW. For orders of 4+ courts, factories offer 5-10% volume discounts. Budget $2-4K for third-party QC inspection (SGS, Bureau Veritas). The math works when you are building 4 or more courts.',
                    },
                    {
                      title: 'Existing building conversion',
                      body: 'Converting a warehouse, tennis center, or large retail space eliminates the building shell cost entirely. You need 8m minimum clear height for commercial play (6m absolute minimum for recreational). Conversion costs run $30-60 per square foot vs $80-150 for new construction.',
                    },
                    {
                      title: 'Standard over panoramic',
                      body: 'Standard classic courts ($30-50K) cost 25-40% less than full panoramic ($45-80K). For a commercial club focused on recurring bookings rather than tournament hosting, standard courts deliver the same playing experience at lower cost. Upgrade to panoramic for showcase courts only.',
                    },
                  ].map((tip) => (
                    <div key={tip.title} className="border-b border-[color:var(--color-border)] pb-6">
                      <h3 className="font-serif text-xl tracking-tight">{tip.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{tip.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky TOC sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-8 flex flex-col gap-3">
                <p className="text-[10px] uppercase tracking-[0.25em] text-court">On this page</p>
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="feera-motion text-xs leading-relaxed text-[color:var(--color-fg-muted)] hover:text-court"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">Next step</p>
          <h2 className="mx-auto mt-4 max-w-[24ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Price your project in 60 seconds.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Use the Feera Courts configurator to build your facility, select
            your court type, and get a preliminary cost estimate.
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
            <Link href="/courts/guides" className="feera-motion group flex flex-col gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">&larr; All guides</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Back to guide index</span>
            </Link>
          </div>
          <div className="flex-1 px-6 py-8 text-end">
            <Link href="/courts/guides/detroit-vs-windsor-padel" className="feera-motion group flex flex-col items-end gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Next guide &rarr;</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Detroit vs Windsor</span>
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
