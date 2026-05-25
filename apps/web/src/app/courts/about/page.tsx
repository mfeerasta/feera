import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'About — Feera Courts',
  description:
    'Feera Courts is the financial partner padel operators do not yet have. Conservative underwriting, demand-data backed, built on capital discipline.',
};

export default function AboutPage() {
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
              href="/courts/methodology"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Methodology
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
            About
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            The financial partner operators do not yet have.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Feera Courts exists because padel facility development in North
            America lacks rigorous financial underwriting. We bring the tools of
            institutional capital to a market that needs them.
          </p>
        </div>
      </section>

      {/* Meer bio */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_2fr]">
            <div>
              <div className="aspect-[3/4] w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-fold)]">
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                  Photo
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <p className="text-xs uppercase tracking-[0.3em] text-court">
                Principal
              </p>
              <h2 className="font-serif text-4xl tracking-tight md:text-5xl">
                Meer Feerasta
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--color-fg-muted)]">
                Meer is Financial Director of Rupafab Limited, a Pakistani holding
                company with interests in textiles, manufacturing, and real estate.
                He brings a CFO toolkit to padel facility underwriting: capital
                allocation, cost modeling, cash flow forecasting, and risk analysis.
              </p>
              <p className="text-base leading-relaxed text-[color:var(--color-fg-muted)]">
                With family ties in Windsor, Ontario and Detroit, Michigan, Meer
                identified the Windsor-Detroit corridor as an unaddressed market
                for padel. He operates across multiple ventures, applying the same
                financial discipline to each. Feera Courts is not a lifestyle
                project. It is a multi-decade venture built on the conviction that
                padel facility development requires better financial infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Growth story */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            The thesis
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Padel in North America, 2026.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h3 className="font-serif text-2xl tracking-tight">
                The growth story
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Padel is the fastest-growing racquet sport globally. The U.S. market
                is projected to reach $267 million by 2030 at an 11.1% CAGR. Canada
                is earlier in the adoption curve but accelerating, with new
                facilities opening monthly across Ontario, British Columbia, and
                Alberta.
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                The fundamentals are strong: padel is easier to learn than tennis,
                more social than pickleball, and generates higher per-player revenue
                through membership models, coaching, and food and beverage. The
                question is not whether the market will grow. The question is
                whether individual facilities are underwritten correctly.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <h3 className="font-serif text-2xl tracking-tight">
                The Sweden cautionary tale
              </h3>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                Between 2020 and 2023, Sweden experienced explosive padel growth.
                By early 2024, the market was oversaturated. Roughly 30% of
                facilities closed or entered financial distress. The pattern was
                consistent: operators assumed peak-year utilization from day one,
                underestimated energy costs, and built in markets without sufficient
                population density.
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                We study Sweden not to argue against padel, but to argue for
                disciplined underwriting. Every project we advise on must survive
                our stress test, modeled directly on the conditions that caused
                Swedish facility failures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-border thesis */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-fg-muted)]">
            Market focus
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            The Windsor-Detroit corridor.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Windsor, Ontario and metro Detroit share a combined population of
            over 5 million. The corridor has exactly one padel facility (Zmash,
            Troy, MI). Cross-border traffic moves daily through the Ambassador
            Bridge and the Detroit-Windsor Tunnel. The market is underserved.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                stat: '5M+',
                label: 'Combined population',
                body: 'Windsor CMA plus Detroit-Warren-Dearborn MSA.',
              },
              {
                stat: '1',
                label: 'Existing padel facility',
                body: 'Zmash in Troy, MI. No facilities in Windsor or downtown Detroit.',
              },
              {
                stat: 'CETA',
                label: 'Trade advantage',
                body: 'Canada-EU free trade agreement eliminates duties on European court imports to Windsor. Saves $20K-$40K per 4-court order versus U.S. import.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="feera-motion flex flex-col gap-4 border border-[color:var(--color-border)] p-8 hover:border-court"
              >
                <p className="font-serif text-4xl text-court">{item.stat}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                  {item.label}
                </p>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Values
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            How we operate.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                title: 'Capital discipline',
                body: 'Every dollar of capex must be justified by the demand model. We do not recommend spending that the pro forma cannot support. Overbuilding is the primary risk in padel, and we treat it accordingly.',
              },
              {
                title: 'Demand-data backed',
                body: 'Decisions are driven by data, not enthusiasm. We combine platform analytics, census data, and participation rates to build forecasts. If the data does not support the project, we say so directly.',
              },
              {
                title: 'Refuse the bad deal',
                body: 'We will decline engagements where the numbers do not work. Our reputation depends on the success of every project we advise on. We would rather lose a fee than see an operator lose their investment.',
              },
            ].map((value) => (
              <div key={value.title} className="flex flex-col gap-4">
                <h3 className="font-serif text-2xl tracking-tight">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <h2 className="mx-auto max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Let us talk about your project.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Get a free consultation
            </Link>
            <Link
              href="/courts/methodology"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-court hover:text-court"
            >
              Read our methodology
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
            <Link href="/courts/methodology" className="feera-motion hover:text-[color:var(--color-accent)]">Methodology</Link>
            <Link href="/courts/partners" className="feera-motion hover:text-[color:var(--color-accent)]">Partners</Link>
            <Link href="/courts/work" className="feera-motion hover:text-[color:var(--color-accent)]">Our Work</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
