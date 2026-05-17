import Link from 'next/link';
import { getT } from '@/lib/i18n/t';
import { LocaleSwitcher } from '@/components/locale-switcher';

export const metadata = {
  title: 'Terms — Feera',
  description: 'The rules of using Feera.',
};

/**
 * Terms of service. Section headings translated for nav clarity; full legal
 * body stays English in Phase 1 for legal accuracy. Phase 2 commissions
 * certified translations.
 */
export default async function TermsPage() {
  const t = await getT();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            feera
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <Link
              href="/"
              className="text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              {t('common.back')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-[80px]" lang="en" dir="ltr">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-fg-muted)]">
          {t('terms.lastUpdated')}
        </p>
        <h1 className="mt-6 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
          {t('terms.title')}
        </h1>

        <div className="mt-12 space-y-10 text-base leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.acceptance')}
            </h2>
            <p className="mt-3">
              Feera is operated by Feerasta Ventures. These terms govern your use of
              the Feera website, mobile apps, and services. By using Feera you accept
              these terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.accounts')}
            </h2>
            <p className="mt-3">
              You agree to keep your contact details accurate, to keep your sign-in
              credentials private, and to be at least 16 years old (or have parent or
              guardian permission). You are responsible for activity under your account
              including bookings and payments you authorise.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.bookings')}
            </h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>
                When you book a court you commit to pay the per-seat price for the
                seats you reserve, in the currency of the host club.
              </li>
              <li>
                Cancellation policy: more than 24 hours before start, full refund. 4 to
                24 hours before, 50% refund. Less than 4 hours, no refund.
              </li>
              <li>
                Open match seats: joiners settle their share through Feera. If no
                joiners fill in time, you forfeit the unsold seats.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.payments')}
            </h2>
            <p className="mt-3">
              Refunds settle on the original payment method within 5 to 10 business
              days. Payment provider fees retained by the provider are not refunded.
              Disputes: raise via the in-app dispute flow within 7 days of the booking
              start time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.conduct')}
            </h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>Record accurate match scores. We monitor for sandbagging.</li>
              <li>Show up on time. Repeated no-shows result in restricted access.</li>
              <li>
                Respect every player. Harassment, hate speech, or unsafe conduct
                results in a permanent ban.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.liability')}
            </h2>
            <p className="mt-3">
              Feera is a marketplace. We are not the operator of the clubs you book or
              the coach you hire. Where the law allows, our aggregate liability is
              capped at the amount you paid to us in the prior 12 months.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.changes')}
            </h2>
            <p className="mt-3">
              When we change these terms materially we email affected users at least 30
              days before the change takes effect. Continued use after that date counts
              as acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('terms.section.contact')}
            </h2>
            <p className="mt-3">
              Reach us at{' '}
              <a
                href="mailto:hello@feera.ai"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                hello@feera.ai
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-serif text-xl">
            feera
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}
