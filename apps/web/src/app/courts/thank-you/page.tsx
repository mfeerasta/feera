import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Thank You — Feera Courts',
  description:
    'We have received your inquiry. Meer will reply within 48 hours.',
};

export default function ThankYouPage() {
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
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <section
        data-theme="dark"
        className="bg-[color:var(--color-bg-fold)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-[1280px] flex-col items-center justify-center px-6 py-[107px] text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Thank you
          </p>
          <h1 className="mt-6 max-w-[24ch] font-serif text-5xl font-normal leading-tight tracking-[-0.02em] md:text-6xl">
            We have received your note.
          </h1>
          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-[color:var(--color-fg-muted)]">
            Meer will reply within 48 hours. In the meantime, you can learn
            more about how we evaluate padel facility investments.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/courts/methodology"
              className="feera-motion inline-flex items-center justify-center border border-court bg-court px-6 py-3 text-sm text-cream hover:bg-court/90"
            >
              Read our methodology
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
            <Link href="/courts/methodology" className="feera-motion hover:text-[color:var(--color-accent)]">Methodology</Link>
            <Link href="/courts/work" className="feera-motion hover:text-[color:var(--color-accent)]">Our Work</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
