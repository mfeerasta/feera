import Link from 'next/link';

export const metadata = {
  title: 'Terms — Feera',
  description: 'The rules of using Feera.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            feera
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-[80px]">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-fg-muted)]">
          Last updated 17 May 2026
        </p>
        <h1 className="mt-6 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
          Terms of use.
        </h1>

        <div className="mt-12 space-y-10 text-base leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">Who runs Feera</h2>
            <p className="mt-3">
              Feera is operated by Feerasta Ventures. Reach us at{' '}
              <a
                href="mailto:hello@feera.ai"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                hello@feera.ai
              </a>
              . These terms govern your use of the Feera website, mobile apps, and
              services.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Your account</h2>
            <p className="mt-3">
              You agree to keep your contact details accurate, to keep your sign-in
              credentials private, and to be at least 16 years old (or have parent or
              guardian permission). You are responsible for activity under your account
              including bookings and payments you authorise.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Bookings and payments</h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>
                When you book a court, you commit to pay the per-seat price for the
                seats you reserve, in the currency of the host club.
              </li>
              <li>
                Cancellation policy: more than 24 hours before start, full refund. 4-24
                hours before, 50% refund. Less than 4 hours, no refund. After start, no
                cancellation; the booking is marked no-show or completed via match
                recording.
              </li>
              <li>
                Open match seats: if you open seats to strangers, joiners settle their
                share to the organiser through Feera. If no joiners fill in time, you
                forfeit the unsold seats per the cancellation policy.
              </li>
              <li>
                Refunds settle on the original payment method within 5-10 business days.
                Payment provider fees, where retained by the provider, are not refunded.
              </li>
              <li>
                Disputes: raise via the in-app dispute flow within 7 days of the booking
                start time. Beyond 7 days we may decline to mediate.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Fair play</h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>Record accurate match scores. We monitor for sandbagging.</li>
              <li>Show up on time. Repeated no-shows result in restricted access.</li>
              <li>
                Respect every player. Harassment, hate speech, or unsafe conduct results
                in a permanent ban.
              </li>
              <li>
                Pay your share of any open match you join. Unpaid balances are referred
                to our payment partners for collection.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Clubs and coaches</h2>
            <p className="mt-3">
              Clubs and verified coaches operate on Feera under a separate agreement
              that governs commissions, payouts, and quality of service. Players see
              that agreement summarised on each club or coach profile.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Feera Edition</h2>
            <p className="mt-3">
              Edition membership is annual, by invitation, billed in advance, and
              non-transferable. Cancellation by you ends recurring billing; the active
              membership term continues to its expiry. Cancellation by us (for breach
              of these terms) is effective immediately and may include a pro-rata
              refund at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Content</h2>
            <p className="mt-3">
              You own the content you post (photos, chat messages, reviews). You grant
              Feera a non-exclusive licence to display it within the platform for the
              purpose of running the service. Don't post anything you don't have the
              rights to.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Liability</h2>
            <p className="mt-3">
              Feera is a marketplace. We are not the operator of the clubs you book or
              the coach you hire. Injuries, lost items, and venue conditions are the
              responsibility of the club. Where the law allows, Feera's aggregate
              liability is capped at the amount you paid to us in the prior 12 months.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Termination</h2>
            <p className="mt-3">
              You may close your account at any time at{' '}
              <Link
                href="/me/delete"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                /me/delete
              </Link>
              . We may suspend or terminate accounts that violate these terms, the
              Privacy policy, or applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Governing law</h2>
            <p className="mt-3">
              These terms are governed by the laws of the Islamic Republic of Pakistan
              for Pakistani users, and by the laws of the United Arab Emirates for users
              in the Gulf Cooperation Council states. EU users get the protections of
              their local consumer-protection laws regardless of these terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Changes</h2>
            <p className="mt-3">
              When we change these terms materially we email affected users at least 30
              days before the change takes effect. Continued use after that date counts
              as acceptance.
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
            Feera ©2026
          </p>
        </div>
      </footer>
    </div>
  );
}
