import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Configurator } from './configurator';

export const metadata: Metadata = {
  title: 'Court Configurator — Feera Courts',
  description:
    'Configure your padel facility and get an instant cost estimate. Choose court type, amenities, technology, and see real-time pricing for Detroit or Windsor.',
};

export default function ConfigurePage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="feera-motion font-serif text-2xl tracking-tight"
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

      <main className="mx-auto max-w-[1440px] px-6 py-12 pb-32 lg:pb-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-court">
            Court configurator
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">
            Build your facility. See the cost.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
            Select your options step by step. The estimate updates in real time.
            Prices reflect current supplier rates, import duties, and
            location-specific costs for Detroit, MI and Windsor, ON.
          </p>
        </div>
        <Configurator />
      </main>
    </div>
  );
}
