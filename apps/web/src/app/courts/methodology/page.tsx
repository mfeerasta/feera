import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Methodology — Feera Courts',
  description:
    'How Feera Courts underwrites padel facility investments. Demand modeling, utilization ramp curves, cost stacks, stress testing, and operating playbooks.',
};

const RAMP_CURVE = [
  { year: 'Year 1', utilization: '40%', note: 'Ramp period. Marketing-heavy. Membership build.' },
  { year: 'Year 2', utilization: '60%', note: 'Word of mouth. League formation. Repeat bookings.' },
  { year: 'Year 3', utilization: '70%', note: 'Stabilized. Peak hours saturated. Off-peak growing.' },
];

const COST_STACK = [
  { item: 'Court hardware (FIP-spec, installed)', cost: '$140,000', highlight: false },
  { item: 'Site fit-out (foundation, drainage, lighting, turf)', cost: '$75,000', highlight: false },
  { item: 'All-in per court', cost: '$215,000', highlight: true },
];

const STRESS_INPUTS = [
  { parameter: 'Electricity price', base: '1.0x', stress: '2.5x base case' },
  { parameter: 'Utilization rate', base: '70% (Year 3)', stress: '35% (half of stabilized)' },
  { parameter: 'Vacancy window', base: '0 days', stress: '90 consecutive days' },
];

const STAFFING_MODEL = [
  { role: 'General Manager', fte: '1.0', note: 'Full-time. Operations, P&L, member relations.' },
  { role: 'Front desk / reception', fte: '2.0', note: 'Shift coverage. Booking support, walk-ins.' },
  { role: 'Maintenance', fte: '0.5', note: 'Part-time. Court care, turf grooming, glass inspection.' },
  { role: 'Head coach', fte: '1.0', note: 'Programming, group lessons, private coaching.' },
  { role: 'Assistant coaches', fte: '1.0', note: 'Junior programs, clinics, peak-hour coverage.' },
  { role: 'Marketing / community', fte: '1.0', note: 'Social, events, league coordination, partnerships.' },
];

export default function MethodologyPage() {
  return (
    <div
      className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      style={{ viewTransitionName: 'feera-root' }}
    >
      {/* Nav */}
      <header className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="feera-motion font-serif text-2xl tracking-tight text-[color:var(--color-fg)]"
            >
              feera
            </Link>
            <span className="text-[color:var(--color-fg-muted)]">/</span>
            <Link
              href="/courts"
              className="feera-motion text-sm text-[color:var(--color-fg-muted)] hover:text-court"
            >
              Courts
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/courts/about"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              About
            </Link>
            <Link
              href="/courts/partners"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Partners
            </Link>
            <Link
              href="/courts/work"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Our Work
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
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Methodology
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            How we underwrite padel facilities.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Every Feera Courts engagement follows the same analytical framework.
            Demand first, then unit economics, then stress testing. If the numbers
            do not survive our worst case, we advise against the project.
          </p>
        </div>
      </section>

      {/* Demand Modeling */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Step 1
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Demand modeling.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h3 className="font-serif text-2xl tracking-tight">
                Data sources
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                We do not guess at demand. We model it from four independent data
                streams, then triangulate.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  {
                    label: 'Feera app data',
                    body: 'Active player counts, booking frequency, court utilization at nearby facilities, and waitlist depth from the Feera platform.',
                  },
                  {
                    label: 'Census demographics',
                    body: 'Population density, household income distribution, age cohort mix, and population growth projections within a 20-minute drive radius.',
                  },
                  {
                    label: 'Racquet sport participation',
                    body: 'Tennis, pickleball, and squash participation rates from Sports and Fitness Industry Association (SFIA) data. Padel converts from adjacent racquet sports at 15-25% rates in mature markets.',
                  },
                  {
                    label: 'Existing facility utilization',
                    body: 'Peak-hour saturation at nearby padel, tennis, and pickleball venues. If existing courts run above 80% utilization at peak, the market signals unmet demand.',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border-b border-[color:var(--color-border)] pb-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-court">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <h3 className="font-serif text-2xl tracking-tight">
                Output: per-site demand forecast
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                The demand model produces a 5-year booking forecast at the
                per-court, per-hour level. It answers one question: how many
                hours per week will each court be booked, and at what price?
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                We segment demand into four revenue streams: open play (drop-in
                bookings), memberships (recurring monthly), coaching and
                programming (lessons, clinics, camps), and events (tournaments,
                corporate, private). Each stream has its own price point and
                utilization profile.
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                The model is conservative by design. We do not assume viral
                growth. We assume gradual adoption following a standard S-curve
                with local market adjustments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Utilization Underwriting */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Step 2
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Utilization underwriting.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We apply a standard ramp curve to every project. No project is
            underwritten at stabilized utilization from day one.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-3">
            {RAMP_CURVE.map((row, i) => (
              <div
                key={row.year}
                className={`flex flex-col gap-4 border-s-2 py-6 ps-6 md:border-s-0 md:border-t-2 md:ps-0 md:pt-6 ${
                  i === 2
                    ? 'border-court'
                    : 'border-[color:var(--color-border)]'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-court">
                  {row.year}
                </p>
                <p className="font-serif text-4xl tracking-tight">
                  {row.utilization}
                </p>
                <p className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                  {row.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            Utilization is measured as a percentage of available peak hours
            (typically 14 hours per day, 7 days per week). A 70% stabilized rate
            means approximately 69 booked hours per court per week. Off-peak
            hours (early morning, late evening) are modeled separately at lower
            price points and lower fill rates.
          </p>
        </div>
      </section>

      {/* Cost Modeling */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Step 3
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Cost modeling.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We work from a per-court all-in cost stack. This number is the
            foundation of every pro forma we build.
          </p>
          <div className="mt-16 flex flex-col">
            {COST_STACK.map((row) => (
              <div
                key={row.item}
                className={`flex items-baseline justify-between border-b border-[color:var(--color-border)] py-5 ${
                  row.highlight ? 'border-b-2 border-court' : ''
                }`}
              >
                <span
                  className={`text-sm ${row.highlight ? 'font-medium' : ''}`}
                >
                  {row.item}
                </span>
                <span
                  className={`text-sm ${
                    row.highlight ? 'font-medium text-court' : 'text-[color:var(--color-fg-muted)]'
                  }`}
                >
                  {row.cost}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                What is included
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Court structure (glass, steel, mesh), FIP-spec turf and sand
                infill, LED lighting to 500 lux, concrete foundation with
                drainage, installation labor, and project management. This
                figure reflects mid-range European or North American supply at
                2026 pricing.
              </p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                What is excluded
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Land acquisition or lease deposits, building shell (for indoor
                facilities), clubhouse and amenity fit-out, technology stack,
                working capital, and pre-opening marketing. These are modeled
                separately and vary significantly by project.
              </p>
            </div>
          </div>
          <p className="mt-12 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            We benchmark every project against our cost database of completed
            North American padel installations. If a supplier quote deviates
            more than 15% from benchmark, we investigate before proceeding.
          </p>
        </div>
      </section>

      {/* Stress Testing */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Step 4
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            The Sweden Stress Test.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            In 2023 and 2024, Sweden overbuilt padel capacity. Roughly 30% of
            facilities went under. The operators who failed shared common
            traits: optimistic utilization assumptions, no buffer for energy
            cost spikes, and no plan for seasonal vacancy. We apply those
            failure conditions to every project we evaluate.
          </p>
          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[600px] text-start">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Parameter
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Base case
                  </th>
                  <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Stress case
                  </th>
                </tr>
              </thead>
              <tbody>
                {STRESS_INPUTS.map((row) => (
                  <tr
                    key={row.parameter}
                    className="border-b border-[color:var(--color-border)]"
                  >
                    <td className="py-5 text-sm">{row.parameter}</td>
                    <td className="py-5 text-sm text-[color:var(--color-fg-muted)]">
                      {row.base}
                    </td>
                    <td className="py-5 text-sm font-medium text-court">
                      {row.stress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 border border-court p-8">
            <p className="font-serif text-lg tracking-tight">
              The rule is simple.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              We run every project through all three stress conditions
              simultaneously. If the project cannot service its debt and cover
              operating costs under these conditions, we do not advise on it.
              This is not negotiable. We would rather lose the engagement than
              see an operator lose their investment.
            </p>
          </div>
        </div>
      </section>

      {/* Operating Playbook */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Step 5
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Operating playbook.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            A feasibility study without an operating plan is incomplete. Every
            Feera Courts engagement includes a standard operating playbook
            covering staffing, technology, and the critical first 90 days.
          </p>

          <div className="mt-16">
            <h3 className="text-xs uppercase tracking-[0.25em] text-court">
              Standard staffing model (4-court facility)
            </h3>
            <div className="mt-6 flex flex-col">
              {STAFFING_MODEL.map((row) => (
                <div
                  key={row.role}
                  className="flex items-baseline justify-between border-b border-[color:var(--color-border)] py-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{row.role}</span>
                    <span className="text-xs text-[color:var(--color-fg-muted)]">
                      {row.note}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-court">
                    {row.fte} FTE
                  </span>
                </div>
              ))}
              <div className="flex items-baseline justify-between py-4">
                <span className="text-sm font-medium">Total headcount</span>
                <span className="text-sm font-medium text-court">
                  6.5 FTE
                </span>
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                Booking platform recommendation
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Every Feera Courts project includes the Feera booking platform
                at no additional license cost. The platform handles court
                reservations, membership management, player matching, league
                scheduling, and payment processing. For operators who prefer
                third-party platforms, we also evaluate Playtomic, MATCHi, and
                PlayByPoint based on market fit.
              </p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
                90-day marketing playbook
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                The first 90 days determine whether a facility reaches its Year 1
                utilization target. Our playbook covers: pre-opening waitlist
                building (email, social, local partnerships), opening week
                programming (free clinics, media events, influencer sessions),
                month-one membership drives (founding member pricing, referral
                incentives), and months two and three league formation
                (recreational, intermediate, competitive brackets).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Ready to start?
          </p>
          <h2 className="mx-auto mt-4 max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Let the numbers lead.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Book a free consultation. We will run a preliminary demand model for
            your market and tell you honestly whether the project pencils.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Get a free consultation
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
