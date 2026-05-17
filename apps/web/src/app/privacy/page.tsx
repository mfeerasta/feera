import Link from 'next/link';

export const metadata = {
  title: 'Privacy — Feera',
  description: 'How Feera handles your data.',
};

export default function PrivacyPage() {
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
          Privacy.
        </h1>

        <div className="mt-12 space-y-10 text-base leading-relaxed text-[var(--color-fg)]">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">Who we are</h2>
            <p className="mt-3">
              Feera is operated by Feerasta Ventures. Contact:{' '}
              <a
                href="mailto:hello@feera.ai"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                hello@feera.ai
              </a>
              . The platform serves players and clubs in Pakistan, the Gulf, and the rest
              of the world.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">What we collect</h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>
                Account data: phone number, email, display name, locale, city, optional
                gender, optional profile photo, optional bio.
              </li>
              <li>
                Play data: bookings, matches, scores, ratings, social score, federation
                links if you choose to connect one.
              </li>
              <li>
                Payment data: transaction amount, currency, status, last four digits of
                the card (your full card number is never stored on our servers; it lives
                with our payment providers Stripe, JazzCash, Easypaisa, and 1Link).
              </li>
              <li>
                Device data: IP address, user agent, locale; used for security and
                analytics.
              </li>
              <li>
                Chat data: messages between you and the players or clubs you play with.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Where it lives</h2>
            <p className="mt-3">
              Your data is stored on encrypted Postgres servers hosted by Neon in
              Frankfurt, Germany. Application servers run on Hetzner in Falkenstein,
              Germany. We use Cloudflare for DNS and CDN. We use Stripe for international
              card payments, JazzCash and Easypaisa for Pakistani mobile wallets, and
              1Link Raast for Pakistani interbank transfers. We use Twilio Verify for
              one-time-password delivery via SMS or WhatsApp, and Resend for transactional
              email. Each of these providers has their own privacy posture you may want to
              review.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">How we use it</h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>To let you book courts, find players, and play matches.</li>
              <li>
                To compute your Glicko-2 rating and surface relevant matches and
                opponents.
              </li>
              <li>To process payments to clubs, coaches, and other players.</li>
              <li>
                To send transactional notifications (bookings, payments, match invites)
                via the channel you prefer.
              </li>
              <li>To enforce safety rules (sandbag detection, blocking, no-show flags).</li>
              <li>
                For aggregate, anonymised analytics that help us improve the product. We
                never sell your data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Privacy controls you own</h2>
            <ul className="mt-3 list-disc space-y-2 ps-6">
              <li>
                Gender visibility: choose public, friends-only, or private. Default is
                private.
              </li>
              <li>
                Women-only matchmaking pool: opt in or out at any time. Your women-pool
                rating is computed only from all-women matches.
              </li>
              <li>Channel opt-in per notification type, including marketing.</li>
              <li>
                Friendship-block: blocked users never see your bookings, matches, or
                profile.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Your rights under GDPR</h2>
            <p className="mt-3">
              You can export every piece of data we hold about you at{' '}
              <Link
                href="/me/export"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                /me/export
              </Link>
              . You can request deletion at{' '}
              <Link
                href="/me/delete"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                /me/delete
              </Link>
              . Deletion is honoured within 30 days, with a 7-day grace period in case you
              change your mind. Some non-personal records (anonymised match results that
              affect other players' ratings, tax receipts) are retained for the
              durations required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Security</h2>
            <p className="mt-3">
              Sensitive columns (phone, email, payment method details, federation
              identifiers) are encrypted at rest using Postgres pgcrypto with quarterly
              key rotation. All HTTPS traffic uses TLS 1.3 with HSTS and certificate
              pinning at the edge. We follow OWASP Top 10 mitigations and run automated
              dependency scanning.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Children</h2>
            <p className="mt-3">
              Feera is intended for players aged 16 and older. Under-16 player accounts
              require a parent or guardian to register with Feera support.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Changes</h2>
            <p className="mt-3">
              When we materially change this policy we notify affected users by email and
              update the "last updated" date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Contact</h2>
            <p className="mt-3">
              Questions or complaints? Email{' '}
              <a
                href="mailto:privacy@feera.ai"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                privacy@feera.ai
              </a>
              . If you believe your data has been mishandled and we have not resolved
              your concern, you may also contact your local data protection authority.
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
