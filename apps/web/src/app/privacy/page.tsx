import Link from 'next/link';
import { getT } from '@/lib/i18n/t';
import { LocaleSwitcher } from '@/components/locale-switcher';

export const metadata = {
  title: 'Privacy — Feera',
  description: 'How Feera handles your data.',
};

/**
 * Privacy page. Per ADR / brief: section headings are translated for nav
 * clarity but the full legal body stays English in Phase 1 for legal
 * accuracy. Phase 2 will commission certified Urdu and Arabic translations.
 */
export default async function PrivacyPage() {
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
          {t('privacy.lastUpdated')}
        </p>
        <h1 className="mt-6 font-serif text-5xl leading-tight tracking-tight md:text-6xl">
          {t('privacy.title')}
        </h1>

        <div className="mt-12 space-y-10 text-base leading-relaxed text-[var(--color-fg)]">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.collect')}
            </h2>
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
                the card. Your full card number is never stored on our servers.
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
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.use')}
            </h2>
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
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.share')}
            </h2>
            <p className="mt-3">
              Data is stored on encrypted Postgres servers hosted by Neon in Frankfurt,
              Germany. Application servers run on Hetzner in Falkenstein, Germany. We
              use Cloudflare for DNS and CDN, Stripe for international card payments,
              JazzCash and Easypaisa for Pakistani mobile wallets, 1Link Raast for
              Pakistani interbank transfers, Twilio Verify for OTP delivery via SMS or
              WhatsApp, and Resend for transactional email.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.rights')}
            </h2>
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
              . Deletion is honoured within 30 days, with a 7-day grace period.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.retention')}
            </h2>
            <p className="mt-3">
              Account data is retained for as long as your account is active and for 30
              days after deletion. Match and rating data is retained for as long as
              other affected players' ratings depend on it. Tax receipts are retained
              for the periods required by Pakistani, UAE, and EU tax law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.security')}
            </h2>
            <p className="mt-3">
              Sensitive columns (phone, email, payment method details, federation
              identifiers) are encrypted at rest using Postgres pgcrypto with quarterly
              key rotation. All HTTPS traffic uses TLS 1.3 with HSTS. We follow OWASP
              Top 10 mitigations and run automated dependency scanning.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              {t('privacy.section.contact')}
            </h2>
            <p className="mt-3">
              Questions or complaints? Email{' '}
              <a
                href="mailto:privacy@feera.ai"
                className="underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
              >
                privacy@feera.ai
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
