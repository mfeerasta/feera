import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Detroit vs Windsor: Where to Build Your Padel Club -- Feera Courts',
  description:
    'Side-by-side comparison of building a padel club in Detroit, MI vs Windsor, ON. Taxes, import duties, CETA savings, lease rates, labor costs, permits, and competitive landscape.',
  openGraph: {
    title: 'Detroit vs Windsor: Where to Build Your Padel Club',
    description:
      'Tax rates, import duties, lease costs, labor, permits, and competition. A cross-border comparison for padel operators.',
    url: 'https://www.feera.ai/courts/guides/detroit-vs-windsor-padel',
    siteName: 'Feera',
    type: 'article',
  },
};

const COMPARISON_DATA = [
  { factor: 'Sales tax', detroit: '6% MI sales tax', windsor: '13% ON HST (5% GST + 8% PST)', note: 'HST applies to construction materials and services in Ontario. Michigan sales tax applies to tangible goods but many construction services are exempt.' },
  { factor: 'Property tax rate', detroit: '~8.2% (Detroit city)', windsor: '~4.8% (City of Windsor)', note: 'Detroit city rates are among the highest in the US. Suburban Michigan locations (Troy, Ann Arbor) run 3-5%. Windsor rates are competitive for Ontario.' },
  { factor: 'Import duty on EU courts', detroit: '10% baseline + 25% steel tariff', windsor: '0% under CETA', note: 'CETA (Canada-EU Comprehensive Economic and Trade Agreement) eliminates duties on EU-origin padel courts imported to Canada. No US equivalent exists. For a 4-court European order, this saves $20,000-$40,000.' },
  { factor: 'Import duty on China courts', detroit: '25% + anti-dumping risk', windsor: '25% surtax (as of Oct 2024)', note: 'Both countries impose significant tariffs on Chinese steel products. Neither side has a clear advantage for factory-direct Asian courts.' },
  { factor: 'Commercial lease (per sq ft/year)', detroit: '$8 - $16 NNN', windsor: 'CAD $10 - $18 NNN', note: 'Detroit suburban industrial space is abundant and affordable. Windsor has less inventory but rates are competitive. Both markets have large-format spaces suitable for 4-8 court indoor facilities.' },
  { factor: 'Construction labor (per hour)', detroit: '$35 - $55 USD', windsor: 'CAD $38 - $58', note: 'Prevailing wage requirements in Michigan apply to public projects but not private commercial. Ontario construction labor is slightly more expensive in real terms after currency conversion.' },
  { factor: 'Minimum wage impact', detroit: '$10.56/hr (MI 2026)', windsor: 'CAD $17.20/hr (ON 2026)', note: 'Affects front desk, reception, and entry-level staff. Ontario minimum wage is significantly higher, increasing monthly operating costs by $2,000-$4,000 for a typical 4-court facility.' },
  { factor: 'Electricity cost', detroit: '$0.11 - $0.14/kWh', windsor: 'CAD $0.10 - $0.17/kWh (TOU)', note: 'Ontario has time-of-use pricing. Off-peak rates are competitive. On-peak rates (weekday evenings, when courts are busiest) are higher. Michigan rates are more predictable.' },
];

const TOC = [
  { id: 'market-overview', label: 'Market overview' },
  { id: 'tax-comparison', label: 'Tax and duty comparison' },
  { id: 'import-duties', label: 'Import duties and CETA' },
  { id: 'lease-labor', label: 'Lease rates and labor' },
  { id: 'permits', label: 'Permit timelines' },
  { id: 'competition', label: 'Competition landscape' },
  { id: 'verdict', label: 'Verdict' },
];

export default function DetroitVsWindsorPage() {
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
            Detroit vs Windsor: where to build your padel club.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            The Detroit-Windsor corridor is one of the most promising padel
            markets in North America. 5 million people, one existing dedicated
            facility, and a unique cross-border dynamic that creates real cost
            advantages depending on which side of the river you build.
          </p>
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">6 min read</p>
        </div>
      </section>

      {/* Content with TOC */}
      <section data-theme="light" className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_240px]">
            <div className="flex flex-col gap-24">

              {/* Market overview */}
              <div id="market-overview">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 1</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Market overview.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Metro Detroit (Wayne, Oakland, Macomb, and Washtenaw counties) has a population of
                  approximately 4.3 million. Windsor-Essex adds another 400,000+, and the broader
                  Southwestern Ontario corridor (London, Kitchener-Waterloo) brings the catchment to
                  over 5 million people within a 90-minute drive.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  As of mid-2026, there is one dedicated padel facility in the greater Detroit area:
                  Zmash in Sterling Heights, MI, which operates a multi-sport model (padel, pickleball,
                  soccer). Windsor has zero dedicated padel courts. The Windsor Racquet Club offers
                  tennis and platform tennis but has not added padel.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The demographic profile is strong for padel. Median household income in Oakland County
                  (Troy, Bloomfield Hills, Birmingham) exceeds $85,000. Windsor-Essex median household
                  income is approximately CAD $75,000. Both markets have large tennis and pickleball
                  communities, and historical data from markets like Miami, Dallas, and Madrid show that
                  padel converts 15-25% of adjacent racquet sport players within 18-24 months of facility
                  opening.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-0 md:grid-cols-3">
                  {[
                    { stat: '5M+', label: 'Combined population within 90 minutes' },
                    { stat: '1', label: 'Dedicated padel facility in the corridor today' },
                    { stat: '15-25%', label: 'Conversion rate from tennis/pickleball to padel' },
                  ].map((tile) => (
                    <div key={tile.stat} className="flex flex-col gap-3 border border-[color:var(--color-border)] p-8">
                      <p className="font-serif text-4xl text-court">{tile.stat}</p>
                      <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">{tile.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax comparison */}
              <div id="tax-comparison">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 2</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Tax and duty comparison.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The tax structures are different enough to shift project economics meaningfully.
                  Michigan has lower sales tax and no harmonized tax, but higher property tax rates in
                  Detroit proper. Ontario has higher consumption taxes but offers CETA duty elimination
                  on European-origin courts, which can save $20,000-$40,000 on a 4-court project.
                </p>

                <div className="mt-12 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-start">
                    <thead>
                      <tr className="border-b border-[color:var(--color-border)]">
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Factor</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Detroit, MI</th>
                        <th className="py-4 text-start text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Windsor, ON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_DATA.map((row, i) => (
                        <tr key={i} className="border-b border-[color:var(--color-border)]">
                          <td className="py-5 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">{row.factor}</td>
                          <td className="py-5 text-sm">{row.detroit}</td>
                          <td className="py-5 text-sm">{row.windsor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  {COMPARISON_DATA.map((row, i) => (
                    <p key={i} className="text-xs leading-relaxed text-[color:var(--color-fg-muted)]">
                      <span className="font-medium">{row.factor}:</span> {row.note}
                    </p>
                  ))}
                </div>
              </div>

              {/* Import duties deep dive */}
              <div id="import-duties">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 3</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">The CETA advantage.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  CETA (Canada-EU Comprehensive Economic and Trade Agreement) is the single biggest
                  cost differentiator between Detroit and Windsor for operators who want European courts.
                  Under CETA, EU-origin padel courts enter Canada duty-free. The US has no equivalent
                  trade agreement with the EU, meaning the same courts attract a 10% baseline tariff
                  plus a 25% steel/aluminum surcharge when imported to Michigan.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  For a concrete example: a 4-court order from MejorSet (Spain) at $40,000 per court
                  EXW has a landed cost of approximately $48,000-$52,000 per court in Windsor (freight
                  only, zero duty) vs $56,000-$64,000 per court in Detroit (freight plus 35% combined
                  tariff). That is a $32,000-$48,000 difference on a single order.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  If you plan to source from European premium suppliers (MejorSet, Manzasport, Portico
                  Sport, Italian Padel), Windsor is the clear winner on import economics. If you plan to
                  source from North American suppliers (Absolute Padel, PadelBox) or factory-direct from
                  Asia, the duty difference largely disappears, and the decision shifts to other factors.
                </p>

                <div className="mt-8 border border-court p-8">
                  <p className="font-serif text-lg tracking-tight">The math on a 4-court European order.</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Detroit (with tariffs)</p>
                      <p className="mt-2 font-serif text-3xl text-[color:var(--color-fg)]">$224,000 - $256,000</p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">4 courts at $56-64K landed</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-court">Windsor (CETA, zero duty)</p>
                      <p className="mt-2 font-serif text-3xl text-court">$192,000 - $208,000</p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">4 courts at $48-52K landed</p>
                    </div>
                  </div>
                  <p className="mt-6 text-sm font-medium text-court">Savings: $32,000 - $48,000</p>
                </div>
              </div>

              {/* Lease and labor */}
              <div id="lease-labor">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 4</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Lease rates and labor costs.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Metro Detroit has abundant large-format commercial and industrial space, particularly
                  in the I-75 corridor (Troy, Auburn Hills, Sterling Heights) and the I-94 corridor
                  (Dearborn, Ypsilanti). Triple-net lease rates for 15,000-30,000 sq ft spaces run $8-16
                  per square foot annually, depending on condition and location.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Windsor has less inventory of suitable large-format spaces, but rates are competitive at
                  CAD $10-18 per square foot NNN. The Lauzon Parkway industrial corridor and the EC Row
                  area have the most suitable buildings. Currency exchange (CAD typically trades at 0.72-0.75
                  USD) makes Windsor leases roughly 20% cheaper in US dollar terms.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Labor is more expensive in Ontario. The Ontario minimum wage of CAD $17.20/hr (2026) is
                  significantly higher than Michigan's $10.56/hr. For a 4-court facility with 6.5 FTE
                  staff, this difference translates to approximately $2,000-$4,000 more per month in
                  payroll costs in Windsor. However, Ontario also has a stronger social safety net
                  (universal healthcare), which reduces employer benefit costs compared to the US where
                  health insurance is typically $400-800/month per employee.
                </p>
              </div>

              {/* Permits */}
              <div id="permits">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 5</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Permit timelines.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Permit timelines are a real differentiator. Detroit's Buildings, Safety Engineering,
                  and Environment Department (BSEED) has a well-documented backlog. Commercial building
                  permits in Detroit city take 4-9 months. Suburban Michigan municipalities (Troy,
                  Bloomfield Township, Ann Arbor) are faster at 2-4 months, but still require plan
                  review, structural engineering sign-off, and multiple inspections.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Ontario building permits for commercial recreation facilities typically take 4-8 weeks
                  for straightforward projects, though complex conversions or sites requiring zoning
                  variances can extend to 3-4 months. The Ontario Building Code is prescriptive and
                  well-documented. AODA (Accessibility for Ontarians with Disabilities Act) compliance
                  adds requirements but is well-understood by local contractors.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Both sides require structural engineering stamps, fire inspections, and occupancy
                  permits. Neither side is fast, but Ontario is generally faster for straightforward
                  commercial builds, and the permitting process is more predictable.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="border border-[color:var(--color-border)] p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Detroit / Metro Michigan</p>
                    <p className="mt-4 font-serif text-3xl tracking-tight">4 - 9 months</p>
                    <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">Detroit city via BSEED. Suburban municipalities faster (2-4 months).</p>
                  </div>
                  <div className="border border-court p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-court">Windsor / Ontario</p>
                    <p className="mt-4 font-serif text-3xl tracking-tight">4 - 8 weeks</p>
                    <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">Straightforward commercial builds. Complex projects 3-4 months.</p>
                  </div>
                </div>
              </div>

              {/* Competition */}
              <div id="competition">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 6</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Competition landscape.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  The competitive landscape is thin on both sides of the border, which is exactly why
                  the corridor is attractive.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.25em] text-court">Michigan</h3>
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="border-b border-[color:var(--color-border)] pb-4">
                        <p className="text-sm font-medium">Zmash (Sterling Heights)</p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          Multi-sport facility with padel, pickleball, and indoor soccer. Not a
                          dedicated padel club. Located in northern Macomb County. Draws from a
                          different catchment than downtown Detroit, Dearborn, or the western suburbs.
                        </p>
                      </div>
                      <div className="border-b border-[color:var(--color-border)] pb-4">
                        <p className="text-sm font-medium">Tennis clubs with conversion potential</p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          Several clubs in Oakland County (Bloomfield Hills, Birmingham) have explored
                          padel but not committed. The conversion economics work when you can repurpose
                          underutilized tennis courts without new construction.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">Ontario</h3>
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="border-b border-[color:var(--color-border)] pb-4">
                        <p className="text-sm font-medium">Windsor Racquet Club</p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          Tennis and platform tennis. No padel courts. Potential conversion candidate
                          or potential competitor if they add padel. Located in South Windsor with
                          strong membership base.
                        </p>
                      </div>
                      <div className="border-b border-[color:var(--color-border)] pb-4">
                        <p className="text-sm font-medium">Toronto and GTA clubs</p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          Multiple padel facilities exist in Toronto (3.5 hours from Windsor). They
                          are not direct competitors but demonstrate that the Ontario market supports
                          padel at $50-80 CAD per hour booking rates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div id="verdict">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">Section 7</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Verdict: it depends on your structure.</h2>
                <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  There is no universally correct answer. The right side of the border depends on your
                  supplier strategy, corporate structure, target demographic, and timeline.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="border border-[color:var(--color-border)] p-8">
                    <h3 className="font-serif text-2xl tracking-tight">Build in Detroit if:</h3>
                    <div className="mt-6 flex flex-col gap-3">
                      {[
                        'You plan to source courts from North American or Asian suppliers (no CETA benefit)',
                        'You want access to the larger 4.3M metro population directly',
                        'Your target market is Oakland County affluent suburbs (Troy, Bloomfield, Birmingham)',
                        'You have existing US corporate structure and banking relationships',
                        'You want lower ongoing labor costs and more predictable utility pricing',
                      ].map((item, i) => (
                        <p key={i} className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="border border-court p-8">
                    <h3 className="font-serif text-2xl tracking-tight">Build in Windsor if:</h3>
                    <div className="mt-6 flex flex-col gap-3">
                      {[
                        'You want European premium courts and can save $32-48K on duties via CETA',
                        'You value faster, more predictable permit timelines',
                        'You want lower property tax rates and cheaper leases in USD terms',
                        'You are comfortable with Canadian corporate structure and banking',
                        'You want to serve the underserved Southwestern Ontario market (zero competition)',
                        'You plan to draw cross-border players from both sides of the tunnel and bridge',
                      ].map((item, i) => (
                        <p key={i} className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-12 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  Both markets are viable. Both are underserved. The corridor can support multiple
                  facilities, and the cross-border dynamic (Canadians traveling to Detroit for
                  entertainment, Americans crossing to Windsor for dining and casino) means a
                  well-positioned club on either side draws from the full 5M+ catchment.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  At Feera Courts, we have active projects on both sides of the border. We model
                  both scenarios in our feasibility studies and let the numbers determine the
                  recommendation.
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
            Model both scenarios.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Our feasibility studies model both Detroit and Windsor options side
            by side, including tariff scenarios, lease comparisons, and 5-year
            P&amp;L projections for each location.
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
            <Link href="/courts/guides/padel-court-cost-2026" className="feera-motion group flex flex-col gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">&larr; Previous guide</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Padel court cost in 2026</span>
            </Link>
          </div>
          <div className="flex-1 px-6 py-8 text-end">
            <Link href="/courts/guides/padel-court-types-explained" className="feera-motion group flex flex-col items-end gap-1 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">Next guide &rarr;</span>
              <span className="text-[color:var(--color-fg-muted)] group-hover:text-court">Court types explained</span>
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
