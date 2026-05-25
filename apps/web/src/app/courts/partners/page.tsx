import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Partners — Feera Courts',
  description:
    'Our network of court manufacturers, booking technology providers, real estate advisors, and legal counsel across North America.',
};

const PARTNER_CATEGORIES = [
  {
    category: 'Court manufacturers',
    theme: 'court' as const,
    partners: [
      {
        name: 'Padel Galis',
        blurb: 'Spanish manufacturer with FIP certification. Full panoramic and semi-panoramic models. 10-year structural warranty.',
      },
      {
        name: 'Mondo',
        blurb: 'Italian sports surfacing and court systems. Official supplier to Premier Padel and multiple FIP events worldwide.',
      },
      {
        name: 'MejorSet',
        blurb: 'Official FIP supplier based in Spain. Distributed in North America through PadelBox with 150+ installer network.',
      },
      {
        name: 'Padel Court Deluxe',
        blurb: 'European premium manufacturer. Tournament-grade glass and steel. Strong presence in the Middle East and North American expansion market.',
      },
      {
        name: 'Bounce Padel Courts',
        blurb: 'Orillia, Ontario. Canadian court supplier and installer. Local manufacturing eliminates import risk and ocean freight timelines.',
      },
    ],
  },
  {
    category: 'Booking technology',
    theme: 'muted' as const,
    partners: [
      {
        name: 'Playtomic',
        blurb: 'Largest padel booking platform globally. Strong in European markets. Growing North American presence. Marketplace model with player discovery.',
      },
      {
        name: 'MATCHi',
        blurb: 'Swedish booking platform with deep padel roots. Club management, membership billing, and league scheduling in one system.',
      },
      {
        name: 'PlayByPoint',
        blurb: 'Court booking and facility management for racquet sports. Access control integration. Used by multi-sport clubs across the U.S.',
      },
      {
        name: 'Feera',
        blurb: 'Sister product. Court booking, player matching, membership management, and league scheduling. Included at no additional license cost with every Feera Courts project.',
      },
    ],
  },
  {
    category: 'Real estate',
    theme: 'muted' as const,
    partners: [
      {
        name: 'CBRE',
        blurb: 'Global commercial real estate. Site identification and lease negotiation for padel facilities. Industrial-to-recreational conversion expertise.',
      },
      {
        name: 'Newmark Detroit',
        blurb: 'Metro Detroit commercial real estate. Warehouse and industrial site sourcing for indoor padel conversions.',
      },
      {
        name: 'JLL Detroit',
        blurb: 'Industrial and retail property advisory. Site selection analytics and tenant representation for padel operators.',
      },
      {
        name: 'Avison Young',
        blurb: 'Canadian and cross-border commercial real estate. Windsor-Detroit corridor expertise. Land and industrial site advisory.',
      },
    ],
  },
  {
    category: 'Legal and tax',
    theme: 'muted' as const,
    partners: [
      {
        name: 'Miller Canfield',
        blurb: 'Cross-border corporate and real estate law. Michigan and Ontario offices. Entity structuring, lease review, and regulatory compliance for U.S.-Canada padel operations.',
      },
      {
        name: 'Aird and Berlis',
        blurb: 'Toronto-based full-service law firm. Canadian corporate structuring, tax planning, and commercial lease negotiation for Ontario padel facilities.',
      },
    ],
  },
];

export default function PartnersPage() {
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
            Partners
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            The network behind every project.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            We work with vetted manufacturers, technology providers, real estate
            advisors, and legal counsel across North America. Every partner is
            selected for track record, not promises.
          </p>
        </div>
      </section>

      {/* Partner categories */}
      {PARTNER_CATEGORIES.map((group, groupIndex) => (
        <section
          key={group.category}
          data-theme={groupIndex % 2 === 0 ? 'light' : 'dark'}
          className={`${
            groupIndex % 2 === 0
              ? 'bg-[color:var(--color-bg)]'
              : 'bg-[color:var(--color-bg-fold)]'
          } text-[color:var(--color-fg)]`}
        >
          <div className="mx-auto max-w-[1280px] px-6 py-[107px]">
            <p
              className={`text-xs uppercase tracking-[0.3em] ${
                group.theme === 'court'
                  ? 'text-court'
                  : 'text-[color:var(--color-fg-muted)]'
              }`}
            >
              {group.category}
            </p>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {group.partners.map((partner) => (
                <article
                  key={partner.name}
                  className="feera-motion flex flex-col gap-4 border border-[color:var(--color-border)] p-8 hover:border-court"
                >
                  <div className="flex h-16 w-16 items-center justify-center border border-[color:var(--color-border)] bg-[color:var(--color-bg-fold)]">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                      Logo
                    </span>
                  </div>
                  <h3 className="font-serif text-xl tracking-tight">
                    {partner.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
                    {partner.blurb}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="border-y border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Join our network
          </p>
          <h2 className="mx-auto mt-4 max-w-[24ch] font-serif text-5xl leading-tight tracking-tight md:text-6xl">
            Are you a supplier or service provider?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[color:var(--color-fg-muted)]">
            We are always evaluating new partners. If you manufacture courts,
            provide technology, or advise on real estate or legal matters for
            padel facilities, we want to hear from you.
          </p>
          <div className="mt-10">
            <Link
              href="/courts#quote"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Contact us
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
            <Link href="/courts/work" className="feera-motion hover:text-[color:var(--color-accent)]">Our Work</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
