import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Padel Court Guides — Feera Courts',
  description:
    'In-depth guides on padel court costs, court types, club ROI, and where to build in North America. Data-driven resources for operators and investors.',
  openGraph: {
    title: 'Padel Court Guides — Feera Courts',
    description:
      'In-depth guides on padel court costs, court types, club ROI, and where to build in North America.',
    url: 'https://www.feera.ai/courts/guides',
    siteName: 'Feera',
    type: 'website',
  },
};

const GUIDES = [
  {
    slug: 'padel-court-cost-2026',
    title: 'How much does a padel court cost in 2026?',
    description:
      'Complete cost breakdown: court hardware, turf, lighting, foundation, shipping, installation, and hidden costs. Per-court and full-project numbers.',
    readTime: '8 min read',
  },
  {
    slug: 'detroit-vs-windsor-padel',
    title: 'Detroit vs Windsor: where to build your padel club',
    description:
      'Tax rates, import duties, lease costs, labor, permits, and competition. A side-by-side comparison for the cross-border corridor.',
    readTime: '6 min read',
  },
  {
    slug: 'padel-court-types-explained',
    title: 'Padel court types explained: panoramic, semi-panoramic, standard, and indoor',
    description:
      'What each court configuration costs, where it fits, and how to choose the right type for your climate, budget, and use case.',
    readTime: '5 min read',
  },
  {
    slug: 'padel-club-roi',
    title: 'Padel club ROI: what owners actually make',
    description:
      'Revenue streams, pricing benchmarks, operating costs, breakeven timelines, and stabilized EBITDA margins. Real numbers from real facilities.',
    readTime: '7 min read',
  },
];

export default function GuidesIndexPage() {
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
            <span className="text-[color:var(--color-fg-muted)]">/</span>
            <span className="text-sm text-[color:var(--color-fg)]">
              Guides
            </span>
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
            Guides
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            Build smarter. Build informed.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Data-driven guides for padel court operators and investors in North
            America. Costs, comparisons, court types, and financial returns,
            all grounded in real project data.
          </p>
        </div>
      </section>

      {/* Guide cards */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/courts/guides/${guide.slug}`}
                className="feera-motion group flex flex-col gap-4 border border-[color:var(--color-border)] p-8 hover:border-court"
              >
                <p className="text-[10px] uppercase tracking-[0.25em] text-court">
                  {guide.readTime}
                </p>
                <h2 className="font-serif text-2xl tracking-tight group-hover:text-court md:text-3xl">
                  {guide.title}
                </h2>
                <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                  {guide.description}
                </p>
                <p className="mt-auto pt-4 text-xs uppercase tracking-[0.2em] text-court">
                  Read guide &rarr;
                </p>
              </Link>
            ))}
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
            From research to reality.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            Configure your facility in the court builder, or request a
            feasibility study from our team.
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
