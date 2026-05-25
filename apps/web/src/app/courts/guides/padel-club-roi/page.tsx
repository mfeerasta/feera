import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Padel Club ROI: What Owners Actually Make — Feera Courts',
  description:
    'Revenue streams, pricing benchmarks ($30-200/hr), monthly operating costs ($46-49K for 4 courts), breakeven timelines (14 months operational, 24-56 months capital), and stabilized EBITDA margins (30-35%). Real financial data for padel club investors.',
  openGraph: {
    title: 'Padel Club ROI: What Owners Actually Make',
    description:
      'Revenue streams, operating costs, breakeven timelines, and EBITDA margins for padel clubs. Real numbers from real facilities.',
    url: 'https://www.feera.ai/courts/guides/padel-club-roi',
    siteName: 'Feera',
    type: 'article',
  },
};

const REVENUE_STREAMS = [
  { stream: 'Court bookings (open play)', share: '50 - 60%', description: 'Hourly court rentals. The core revenue driver. Peak hours ($50-80/hr) subsidize off-peak ($30-40/hr). Dynamic pricing increases yield by 10-15%.' },
  { stream: 'Memberships', share: '15 - 20%', description: 'Monthly recurring revenue. Founding member rates ($99-149/mo) convert to standard rates ($149-249/mo) after 3 months. Members book 2-3x more frequently than drop-ins.' },
  { stream: 'Coaching and programming', share: '10 - 15%', description: 'Group clinics ($25-40/person), private lessons ($60-120/hr), junior programs, camps. Higher margin than court bookings. Drives off-peak utilization.' },
  { stream: 'Pro shop and retail', share: '5 - 10%', description: 'Padel rackets ($80-300), balls, grips, apparel, accessories. Margins of 40-60% on equipment. Demo racket programs drive sales.' },
  { stream: 'F&B (food and beverage)', share: '5 - 10%', description: 'Cafe, bar, or vending. Post-match socializing is a core part of padel culture. Licensed alcohol service can double F&B revenue but adds regulatory complexity.' },
];

const PRICING_BENCHMARKS = [
  { market: 'New York City (Manhattan)', peak: '$120 - $200', offPeak: '$80 - $120', note: 'Highest rates in North America. Limited supply, high demand, premium real estate.' },
  { market: 'Miami / South Florida', peak: '$60 - $100', offPeak: '$40 - $60', note: 'Strong Hispanic padel culture. Outdoor year-round. High competition driving rates down.' },
  { market: 'Dallas / Austin', peak: '$50 - $80', offPeak: '$30 - $50', note: 'Growing market. Mix of indoor and outdoor. Rates climbing as demand builds.' },
  { market: 'Toronto / GTA', peak: 'CAD $60 - $90', offPeak: 'CAD $40 - $60', note: 'Indoor required. Higher per-court costs offset by year-round revenue.' },
  { market: 'Detroit / Windsor (projected)', peak: '$50 - $70', offPeak: '$30 - $45', note: 'Based on comparable Midwest markets and Feera app demand data. Limited supply supports higher initial pricing.' },
  { market: 'Chicago', peak: '$50 - $80', offPeak: '$35 - $50', note: 'Growing rapidly. Indoor required for ~5 months. Similar demographic to Detroit metro.' },
];

const MONTHLY_OPS = [
  { item: 'Facility lease (15,000 sq ft)', cost: '$15,000', note: 'Based on $12/sq ft NNN annual rate. Varies significantly by location. Detroit suburbs $8-16, Windsor CAD $10-18.' },
  { item: 'Staff wages (6.5 FTE)', cost: '$23,700', note: 'GM ($65K), 2 front desk ($35K each), 0.5 maintenance ($20K pro-rata), head coach ($55K), assistant ($40K), marketing ($45K). Plus benefits and payroll taxes.' },
  { item: 'Utilities (electric, gas, water)', cost: '$3,500', note: 'Lighting is the largest component. LED systems reduce electricity by 50-75% vs halogen. Indoor facilities have higher HVAC costs.' },
  { item: 'Insurance', cost: '$1,200', note: 'General liability + property. Glass breakage riders add $200-400/month. Higher for indoor facilities.' },
  { item: 'Software and technology', cost: '$800', note: 'Booking platform (Feera: included), POS system, accounting, marketing tools, camera system subscriptions.' },
  { item: 'Court maintenance', cost: '$800 - $1,600', note: 'Turf grooming, sand leveling, glass inspection, net replacement. Budget $2,000-$6,000 per court per year.' },
  { item: 'Marketing', cost: '$1,000 - $3,000', note: 'Year 1 is marketing-heavy. Budget shifts from acquisition to retention after month 6. Social media, local events, referral programs.' },
];

const REVENUE_TRAJECTORY = [
  {
    year: 'Year 1',
    revenue: '~$675,000',
    utilization: '38%',
    note: 'Ramp period. Heavy marketing spend. Membership base building. First leagues forming. Revenue weighted to second half of the year.',
  },
  {
    year: 'Year 2',
    revenue: '~$960,000',
    utilization: '55%',
    note: 'Word of mouth effect. League expansion. Coaching programs established. Repeat bookings increasing. Off-peak filling.',
  },
  {
    year: 'Year 3',
    revenue: '~$1,140,000',
    utilization: '65%',
    note: 'Stabilized operations. Peak hours saturated. Off-peak growing. Membership churn stabilized at 5-8% monthly. Tournament hosting adds incremental revenue.',
  },
];

const TOC = [
  { id: 'revenue-streams', label: 'Revenue streams' },
  { id: 'pricing', label: 'Pricing benchmarks' },
  { id: 'operating-costs', label: 'Monthly operating costs' },
  { id: 'revenue-trajectory', label: 'Revenue trajectory' },
  { id: 'breakeven', label: 'Breakeven timeline' },
  { id: 'ebitda', label: 'Stabilized EBITDA' },
  { id: 'sweden', label: 'The Sweden cautionary tale' },
];

export default function PadelClubRoiPage() {
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
            Padel club ROI: what owners actually make.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Revenue streams, pricing benchmarks, operating costs, breakeven
            timelines, and stabilized margins. The financial reality of owning
            a padel club in North America, based on data from operating
            facilities and Feera Courts feasibility studies.
          </p>
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">7 min read</p>
        </div>
      </section>

      {/* Content with TOC */}
      <section data-theme="light" className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
            <div className="flex flex-col gap-24">

              {/* Revenue streams */}
              <div id="revenue-streams">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 1</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Revenue streams.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  A well-run padel club generates revenue from five primary sources. Court bookings are
                  the foundation, but the most profitable clubs build recurring membership revenue and
                  high-margin coaching programs alongside the core booking business. The revenue mix
                  matters: clubs that rely on bookings alone are more vulnerable to utilization dips than
                  clubs with diversified streams.
                </p>

                <div className="mt-12 flex flex-col">
                  {REVENUE_STREAMS.map((row, i) => (
                    <div key={i} className="border-b border-[color:var(--color-border)] py-6">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">{row.stream}</span>
                        <span className="text-sm font-medium text-court">{row.share}%</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{row.description}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The percentages above are based on stabilized operations (Year 3+). In Year 1, court
                  bookings often represent 70-80% of revenue because memberships and programming take
                  time to build. By Year 3, successful clubs shift the mix toward recurring revenue
                  (memberships + coaching), which improves cash flow predictability and reduces dependence
                  on walk-in demand.
                </p>
              </div>

              {/* Pricing benchmarks */}
              <div id="pricing">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 2</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Pricing benchmarks by market.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Padel court rental rates in North America range from $30 to $200 per hour depending
                  on market, time of day, and facility quality. Rates have been climbing steadily as
                  demand outpaces supply in most markets. The Detroit-Windsor corridor, with minimal
                  existing supply, can support premium initial pricing.
                </p>

                <div className="mt-12 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-start">
                    <thead>
                      <tr className="border-b border-[color:var(--color-border)]">
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Market</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Peak rate</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Off-peak rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICING_BENCHMARKS.map((row, i) => (
                        <tr key={i} className="border-b border-[color:var(--color-border)]">
                          <td className="py-5 text-sm">{row.market}</td>
                          <td className="py-5 text-sm text-court">{row.peak}</td>
                          <td className="py-5 text-sm text-[color:var(--color-fg-muted)]">{row.offPeak}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  {PRICING_BENCHMARKS.map((row, i) => (
                    <p key={i} className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                      <span className="font-medium">{row.market}:</span> {row.note}
                    </p>
                  ))}
                </div>

                <p className="mt-8 text-xs text-[color:var(--color-fg-muted)]">
                  Sources: Playtomic public rate cards, operator interviews, Feera app booking data,
                  public financial disclosures (where available).
                </p>
              </div>

              {/* Monthly operating costs */}
              <div id="operating-costs">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 3</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Monthly operating costs.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Operating costs for a 4-court facility run approximately $46,000 to $49,000 per month.
                  The two largest line items are facility lease and staff wages, which together represent
                  approximately 80% of monthly spend. These numbers are based on Metro Detroit pricing.
                  Windsor costs are similar in CAD terms but approximately 20% lower in USD after currency
                  conversion.
                </p>

                <div className="mt-12 flex flex-col">
                  {MONTHLY_OPS.map((row, i) => (
                    <div key={i} className="border-b border-[color:var(--color-border)] py-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm">{row.item}</span>
                        <span className="text-sm font-medium text-court">{row.cost}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{row.note}</p>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between border-b-2 border-court py-5">
                    <span className="text-sm font-medium">Total monthly operating cost</span>
                    <span className="text-sm font-medium text-court">~$46,000 - $49,000</span>
                  </div>
                </div>

                <p className="mt-8 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  These figures exclude debt service. If the facility is financed (SBA loan, bank loan,
                  investor capital with preferred returns), monthly debt service of $5,000-$15,000 should
                  be added. All-cash builds eliminate debt service but tie up $500K-$1.5M in capital.
                </p>
              </div>

              {/* Revenue trajectory */}
              <div id="revenue-trajectory">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 4</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Revenue trajectory.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  No padel club reaches stabilized utilization on day one. We underwrite every project
                  using a conservative ramp curve that assumes gradual adoption, not viral growth. The
                  numbers below are for a 4-court facility at Detroit-area pricing ($50/hr average
                  blended rate).
                </p>

                <div className="mt-12 grid grid-cols-1 gap-0 md:grid-cols-3">
                  {REVENUE_TRAJECTORY.map((row, i) => (
                    <div
                      key={row.year}
                      className={`flex flex-col gap-4 border-s-2 py-6 ps-6 md:border-s-0 md:border-t-2 md:ps-0 md:pt-6 ${
                        i === 2 ? 'border-court' : 'border-[color:var(--color-border)]'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-court">{row.year}</p>
                      <p className="font-serif text-4xl tracking-tight">{row.revenue}</p>
                      <p className="text-sm text-[color:var(--color-fg-muted)]">{row.utilization} utilization</p>
                      <p className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">{row.note}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-xs text-[color:var(--color-fg-muted)]">
                  Utilization is measured as a percentage of available peak hours (14 hours/day, 7
                  days/week). Off-peak hours are modeled separately at lower rates and lower fill.
                  Revenue figures include all streams (bookings, memberships, coaching, retail, F&B).
                </p>
              </div>

              {/* Breakeven */}
              <div id="breakeven">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 5</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Breakeven timeline.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  There are two breakeven milestones that matter. Operational breakeven is when monthly
                  revenue exceeds monthly operating costs (before debt service and capital recovery).
                  Capital breakeven is when cumulative net cash flow turns positive, meaning you have
                  recovered your initial investment.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="border border-court p-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-court">Operational breakeven</p>
                    <p className="mt-4 font-serif text-5xl tracking-tight">~14 months</p>
                    <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                      At approximately 38% utilization, a 4-court facility generates enough revenue to
                      cover its monthly operating costs of $46-49K. Most well-managed clubs reach this
                      point in 12-16 months. Clubs that open with a strong pre-opening campaign (waitlist,
                      founding memberships) can reach it in 10-12 months.
                    </p>
                  </div>
                  <div className="border border-[color:var(--color-border)] p-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Capital breakeven</p>
                    <p className="mt-4 font-serif text-5xl tracking-tight">24 - 56 months</p>
                    <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                      The range is wide because it depends on total capital invested. A 4-court outdoor
                      facility at $250-600K recovers capital in 24-36 months. A 4-court indoor facility
                      at $500K-$1.5M takes 36-56 months. The higher indoor costs are offset by 12-month
                      revenue vs 7-8 months outdoor, but the payback is still longer.
                    </p>
                  </div>
                </div>
              </div>

              {/* EBITDA */}
              <div id="ebitda">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 6</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Stabilized EBITDA margin.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  At stabilized operations (Year 3+, 65% utilization), well-managed padel clubs achieve
                  EBITDA margins of 30-35%. This translates to owner income of $100,000-$250,000 per year
                  for a 4-court facility, depending on location, pricing, and revenue mix.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  EBITDA margin improves with scale. An 8-court facility benefits from shared overhead
                  (one GM, one lease, one marketing budget) spread across more revenue-generating courts.
                  The marginal operating cost of each additional court is approximately $2,000-$3,000 per
                  month (maintenance, utilities, incremental staff), while the marginal revenue at 65%
                  utilization is approximately $12,000-$18,000 per month.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-0 md:grid-cols-4">
                  {[
                    { label: 'Year 3 revenue', value: '~$1.14M' },
                    { label: 'EBITDA margin', value: '30-35%' },
                    { label: 'EBITDA', value: '$342K-$399K' },
                    { label: 'Owner income', value: '$100K-$250K' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-2 border border-[color:var(--color-border)] p-6">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">{stat.label}</p>
                      <p className="font-serif text-2xl text-court">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-xs text-[color:var(--color-fg-muted)]">
                  Owner income depends on capital structure. All-cash owners retain full EBITDA minus
                  taxes. Leveraged owners subtract debt service ($5-15K/month). Owners with minority
                  investors share profits per equity split.
                </p>
              </div>

              {/* Sweden cautionary tale */}
              <div id="sweden">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 7</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">The Sweden cautionary tale.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  No discussion of padel club ROI is complete without addressing Sweden. Between 2020
                  and 2023, Sweden experienced the fastest padel facility build-out per capita in the
                  world. By late 2023, Sweden had over 4,500 courts for a population of 10.5 million.
                  Then it crashed. Approximately 30% of Swedish padel facilities went under or entered
                  restructuring in 2023-2024.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The failure patterns were consistent. Operators entered the market with optimistic
                  utilization assumptions (80%+ from day one). They did not model a ramp period. They
                  did not stress-test for energy price spikes (Sweden's electricity prices tripled in
                  2022-2023 due to the European energy crisis). And they built in saturated markets
                  where 3-4 facilities competed for the same player pool.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The operators who survived shared traits: conservative underwriting, diversified
                  revenue (not just bookings), strong community programming, and low fixed costs
                  (owned buildings or long-term leases at below-market rates).
                </p>

                <div className="mt-8 border border-court p-8">
                  <p className="font-serif text-lg tracking-tight">What we learn from Sweden.</p>
                  <div className="mt-6 flex flex-col gap-4">
                    {[
                      'Never underwrite at stabilized utilization from day one. Use a ramp curve (40% Year 1, 60% Year 2, 70% Year 3).',
                      'Stress-test for energy cost spikes (2.5x base case) and utilization drops (half of stabilized rate).',
                      'Diversify revenue. Clubs that rely on bookings alone fail first.',
                      'Study the competitive landscape. If three facilities already serve your catchment, think twice.',
                      'If the project does not survive the stress test, walk away. The market will still be there when conditions improve.',
                    ].map((lesson, i) => (
                      <p key={i} className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                        {lesson}
                      </p>
                    ))}
                  </div>
                </div>

                <p className="mt-8 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  North America is not Sweden. The US has 688 courts for 330 million people (0.002 courts
                  per 1,000 residents). Sweden had 4,500 for 10.5 million (0.43 per 1,000). The risk of
                  oversupply in the US and Canada is years away. But the discipline of conservative
                  underwriting applies everywhere. At Feera Courts, we apply the Sweden stress test to
                  every project. If the numbers do not survive the worst case, we advise against it.
                </p>
                <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">
                  Sources: Swedish Padel Association reports, FIP World Padel Report 2025, Misitrano
                  State of Padel US 2025, operator interviews.
                </p>
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
      </section>

      {/* CTA */}
      <section data-theme="dark" className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">Next step</p>
          <h2 className="mx-auto mt-4 max-w-[24ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Get a feasibility study for your market.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We model revenue, costs, and ROI for your specific location.
            Demand data from the Feera app. Conservative underwriting.
            Honest recommendations.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Request a feasibility study
            </Link>
            <Link
              href="/courts"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-court hover:text-court"
            >
              Back to Courts
            </Link>
          </div>
        </div>
      </section>

      {/* Prev/Next */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto flex max-w-[1280px] items-stretch">
          <div className="flex-1 border-e border-[color:var(--color-border)] px-6 py-8">
            <Link href="/courts/guides/padel-court-types-explained" className="feera-motion group flex flex-col gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">&larr; Previous guide</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Court types explained</span>
            </Link>
          </div>
          <div className="flex-1 px-6 py-8 text-end">
            <Link href="/courts/guides" className="feera-motion group flex flex-col items-end gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">All guides &rarr;</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Back to guide index</span>
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
