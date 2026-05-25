import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Our Work — Feera Courts',
  description:
    'Active and completed padel facility projects across the Windsor-Detroit corridor and broader North America.',
};

const PROJECTS = [
  {
    slug: 'project-alpha',
    name: 'Project Alpha',
    city: 'Windsor, ON',
    courts: 4,
    status: 'In Feasibility',
    role: 'Consulting',
  },
  {
    slug: 'project-beta',
    name: 'Project Beta',
    city: 'Troy, MI',
    courts: 6,
    status: 'Site Selection',
    role: 'Owner\'s Rep + Equity',
  },
  {
    slug: 'project-gamma',
    name: 'Project Gamma',
    city: 'Ann Arbor, MI',
    courts: 4,
    status: 'Early Discussions',
    role: 'Consulting',
  },
];

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'In Feasibility': 'border-court text-court',
    'Site Selection': 'border-amber-500 text-amber-500',
    'Early Discussions': 'border-[color:var(--color-fg-muted)] text-[color:var(--color-fg-muted)]',
  };
  return (
    <span
      className={`inline-flex items-center border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
        colorMap[status] || 'border-[color:var(--color-fg-muted)] text-[color:var(--color-fg-muted)]'
      }`}
    >
      {status}
    </span>
  );
}

export default function WorkPage() {
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
            Our Work
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            Active projects.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Current engagements across the Windsor-Detroit corridor. Project
            names are anonymized. Details are shared under NDA with qualified
            parties.
          </p>
        </div>
      </section>

      {/* Project cards */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PROJECTS.map((project) => (
              <Link
                key={project.slug}
                href={`/courts/work/${project.slug}`}
                className="feera-motion group flex flex-col gap-6 border border-[color:var(--color-border)] p-8 hover:border-court"
              >
                <div className="flex aspect-[16/9] w-full items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-bg-fold)]">
                  <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Rendering
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-2xl tracking-tight group-hover:text-court">
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>
                <div className="grid grid-cols-3 gap-4 border-t border-[color:var(--color-border)] pt-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Location
                    </p>
                    <p className="mt-1 text-sm">{project.city}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Courts
                    </p>
                    <p className="mt-1 text-sm">{project.courts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Role
                    </p>
                    <p className="mt-1 text-sm">{project.role}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline note */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-court">
                Pipeline
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
                More projects in evaluation.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                We are evaluating additional sites across Ontario and Michigan.
                Not every site passes our feasibility threshold. That is by
                design. We only move forward on projects that survive the
                Sweden Stress Test.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Sites evaluated', value: '12+' },
                { label: 'Passed feasibility', value: '3' },
                { label: 'Active engagements', value: '3' },
                { label: 'Declined (numbers did not work)', value: '9+' },
              ].map((row) => (
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
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <h2 className="mx-auto max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Have a site in mind?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We evaluate new opportunities on a rolling basis. Tell us about
            your site, your market, and your timeline. The initial consultation
            is free.
          </p>
          <div className="mt-10">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Get a free consultation
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
            <Link href="/courts/methodology" className="feera-motion hover:text-[color:var(--color-accent)]">Methodology</Link>
            <Link href="/courts/partners" className="feera-motion hover:text-[color:var(--color-accent)]">Partners</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
