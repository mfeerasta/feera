import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Download your data — Feera',
  description: 'Export every record Feera holds about you, per GDPR Article 20.',
};

export default async function ExportPage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in?next=/me/export');
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Your data
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Download your data</h1>
        <p className="mt-6 text-base leading-relaxed text-[color:var(--color-fg-muted)]">
          Under Article 20 of the GDPR you have the right to receive every piece of
          personal data Feera holds about you in a portable format. The archive below
          contains a JSON file per category, packaged as a ZIP.
        </p>

        <section className="mt-10 border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
          <h2 className="font-serif text-xl tracking-tight">What is inside</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:var(--color-fg-muted)]">
            <li><span className="font-medium text-[color:var(--color-fg)]">profile.json</span>: account, rating, social score.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">bookings.json</span>: bookings you organized or joined, plus join requests.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">matches.json</span>: every match you appear in.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">payments.json</span>: payments and payouts where you are payer or payee.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">chats.json</span>: chat memberships plus last 200 messages per chat.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">edition.json</span>: Feera Edition membership record.</li>
            <li><span className="font-medium text-[color:var(--color-fg)]">audit.json</span>: last 90 days of audit entries for actions you took.</li>
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="/api/v1/me/export"
            download
            className="feera-motion inline-flex items-center border border-[color:var(--color-fg)] bg-[color:var(--color-fg)] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
          >
            Download my data
          </a>
          <Link
            href="/me"
            className="feera-motion text-sm uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Back to profile
          </Link>
        </div>

        <p className="mt-10 text-xs text-[color:var(--color-fg-muted)]">
          The download may take a moment for active accounts. If you have trouble,
          contact privacy@feera.ai.
        </p>
      </main>
    </div>
  );
}
