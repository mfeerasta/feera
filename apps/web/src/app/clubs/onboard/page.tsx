import type { Metadata } from 'next';
import { OnboardForm } from './onboard-form';

export const metadata: Metadata = {
  title: 'List your club on Feera',
  description:
    'Self-serve onboarding for padel clubs. Add your courts, set pricing, and start taking bookings.',
};

/**
 * Public club onboarding entry point. The body is rendered on the client
 * (multi-step form with sessionStorage persistence) but the shell is a
 * Server Component for SEO + faster TTFB.
 */
export default function ClubOnboardPage() {
  return (
    <div className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-ink-deep/10 bg-paper">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <a
            href="/"
            className="font-serif text-2xl tracking-tight text-ink-deep"
          >
            feera
          </a>
          <nav className="flex items-center gap-8 text-sm">
            <a
              href="/clubs"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              Browse clubs
            </a>
            <a
              href="/sign-in"
              className="text-ink-deep/70 transition-colors duration-150 hover:text-court"
            >
              Sign in
            </a>
          </nav>
        </div>
      </header>

      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-[80px]">
          <p className="text-xs uppercase tracking-[0.3em] text-brass">
            For clubs
          </p>
          <h1 className="mt-6 max-w-[20ch] font-serif text-5xl leading-none tracking-tight text-cream md:text-6xl">
            List your club on Feera.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/70">
            Four short steps. No setup fees. Approval usually within one
            business day.
          </p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-6 py-[80px]">
          <OnboardForm />
        </div>
      </section>
    </div>
  );
}
