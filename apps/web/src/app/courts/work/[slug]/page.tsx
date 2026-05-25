import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { PrintButton } from './print-button';

const PROJECTS: Record<
  string,
  {
    name: string;
    city: string;
    courts: number;
    status: string;
    role: string;
    capex: string;
    openingDate: string;
  }
> = {
  'project-alpha': {
    name: 'Project Alpha',
    city: 'Windsor, ON',
    courts: 4,
    status: 'In Feasibility',
    role: 'Consulting',
    capex: '$860,000 CAD (est.)',
    openingDate: 'Q2 2027 (projected)',
  },
  'project-beta': {
    name: 'Project Beta',
    city: 'Troy, MI',
    courts: 6,
    status: 'Site Selection',
    role: 'Owner\'s Rep + Equity',
    capex: '$1.4M USD (est.)',
    openingDate: 'Q4 2027 (projected)',
  },
  'project-gamma': {
    name: 'Project Gamma',
    city: 'Ann Arbor, MI',
    courts: 4,
    status: 'Early Discussions',
    role: 'Consulting',
    capex: 'TBD',
    openingDate: 'TBD',
  },
};

export function generateStaticParams() {
  return [
    { slug: 'project-alpha' },
    { slug: 'project-beta' },
    { slug: 'project-gamma' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS[slug];
  const name = project?.name || 'Case Study';
  return {
    title: `${name} — Feera Courts`,
    description: `Case study: ${name}. Padel facility development in ${project?.city || 'North America'}.`,
  };
}

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

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS[slug];

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <div className="text-center">
          <h1 className="font-serif text-4xl">Project not found</h1>
          <Link href="/courts/work" className="mt-4 text-sm text-court hover:underline">
            Back to Our Work
          </Link>
        </div>
      </div>
    );
  }

  const tombstoneData = [
    { label: 'Client', value: 'Disclosed under NDA' },
    { label: 'Role', value: project.role },
    { label: 'Capex', value: project.capex },
    { label: 'Courts', value: String(project.courts) },
    { label: 'Location', value: project.city },
    { label: 'Opening date', value: project.openingDate },
  ];

  const narrativeSections = [
    {
      title: 'The Brief',
      body: 'The client approached Feera Courts to evaluate the viability of a padel facility in their target market. The initial scope included demand modeling, site assessment, cost estimation, and a preliminary pro forma. The client had secured a potential site but needed independent validation before committing capital.',
    },
    {
      title: 'The Market',
      body: 'Our demand model analyzed population density, household income, existing racquet sport participation, and competitive facility utilization within a 20-minute drive radius. We supplemented this with Feera platform data on active players and booking patterns in adjacent markets. The results indicated sufficient unmet demand to support the proposed court count at our standard ramp curve.',
    },
    {
      title: 'Our Work',
      body: 'We delivered a comprehensive feasibility study including: per-court cost modeling benchmarked against our installation database, a 5-year pro forma with three scenarios (base, upside, stress), supplier comparison matrix with landed-cost analysis, and a preliminary facility layout. The project was run through our Sweden Stress Test to validate survivability under adverse conditions.',
    },
    {
      title: 'The Outcome',
      body: 'This project is ongoing. Outcome details will be published upon completion and with client consent. Check back for updates.',
    },
  ];

  return (
    <div
      className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      style={{ viewTransitionName: 'feera-root' }}
    >
      {/* Print styles */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @media print {
          header, footer, .print-hide {
            display: none !important;
          }
          section[data-theme="dark"] {
            background: #fff !important;
            color: #1a1a1a !important;
          }
          section[data-theme="dark"] * {
            color: #1a1a1a !important;
          }
          .feera-motion {
            transition: none !important;
          }
          @page {
            margin: 0.75in;
          }
        }
      `}</style>

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
            <Link
              href="/courts/work"
              className="feera-motion text-sm text-[color:var(--color-fg-muted)] hover:text-court"
            >
              Our Work
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-xs uppercase tracking-[0.3em] text-court">
              Case study
            </p>
            <StatusBadge status={project.status} />
          </div>
          <h1 className="mt-6 max-w-[20ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            {project.name}
          </h1>
          <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
            {project.city}
          </p>
        </div>
      </section>

      {/* Content */}
      <section
        data-theme="light"
        className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-[2fr_1fr]">
            {/* Narrative */}
            <div className="flex flex-col gap-16">
              {narrativeSections.map((section) => (
                <div key={section.title} className="flex flex-col gap-4">
                  <h2 className="font-serif text-3xl tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Tombstone sidebar */}
            <aside className="flex flex-col gap-0 border border-[color:var(--color-border)] p-8 md:sticky md:top-8 md:self-start">
              <h3 className="text-xs uppercase tracking-[0.25em] text-court">
                Project details
              </h3>
              <div className="mt-6 flex flex-col">
                {tombstoneData.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-b border-[color:var(--color-border)] py-4"
                  >
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      {row.label}
                    </span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Placeholder note */}
      <section
        data-theme="dark"
        className="print-hide bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="border border-[color:var(--color-border)] p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
              Note
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              This is a placeholder case study. Real project data will replace
              this content as engagements progress and clients consent to
              publication.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="print-hide border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <h2 className="mx-auto max-w-[20ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Interested in a similar project?
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Get a free consultation
            </Link>
            <PrintButton />
            <Link
              href="/courts/work"
              className="feera-motion inline-flex items-center justify-center border border-[color:var(--color-fg)] px-6 py-3 text-sm text-[color:var(--color-fg)] hover:border-court hover:text-court"
            >
              View all projects
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
