import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/api/request-context';
import { calendarFeedToken } from '@/lib/calendar/ics';
import { CopyButton } from './copy-button';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Calendar — Feera',
  description: 'Subscribe to your Feera bookings in any calendar app.',
};

function calendarSecret(): string {
  return (
    process.env.CALENDAR_FEED_SECRET ??
    process.env.AUTH_SECRET ??
    'feera-calendar-dev-only-fallback'
  );
}

export default async function MyCalendarPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/me/calendar');

  const token = calendarFeedToken(session.userId, calendarSecret());
  const httpsUrl = `https://www.feera.ai/api/v1/me/calendar.ics?userId=${session.userId}&token=${token}`;
  const webcalUrl = httpsUrl.replace(/^https:\/\//, 'webcal://');
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Calendar</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Subscribe to your bookings.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Your confirmed and in-progress bookings flow into any calendar app
            that speaks the standard iCalendar protocol. The link below stays
            warm for the current and previous month, then rotates automatically
            for security.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-6 border border-[var(--color-border)] bg-paper p-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/60">
                  Your calendar URL
                </p>
                <p className="mt-3 break-all font-mono text-xs text-ink-deep">
                  {webcalUrl}
                </p>
              </div>
              <CopyButton text={webcalUrl} label="Copy subscribe URL" />
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border border-[var(--color-fg)] bg-transparent px-6 py-3 text-sm text-[var(--color-fg)] transition-colors duration-150 hover:border-court hover:text-court"
              >
                Add to Google Calendar
              </a>
              <a
                href={webcalUrl}
                className="inline-flex items-center justify-center border border-[var(--color-fg)] bg-transparent px-6 py-3 text-sm text-[var(--color-fg)] transition-colors duration-150 hover:border-court hover:text-court"
              >
                Add to Apple Calendar
              </a>
              <a
                href={httpsUrl}
                className="inline-flex items-center justify-center border border-[var(--color-fg)]/40 bg-transparent px-6 py-3 text-xs uppercase tracking-[0.2em] text-[var(--color-fg-muted)] transition-colors duration-150 hover:border-court hover:text-court"
              >
                Download as .ics
              </a>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="border border-[var(--color-border)] p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-muted)]">
                What syncs
              </p>
              <p className="mt-3 text-sm leading-relaxed">
                Bookings with status confirmed or in progress and a start in the
                future. Past bookings are not exported.
              </p>
            </div>
            <div className="border border-[var(--color-border)] p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-muted)]">
                How fast
              </p>
              <p className="mt-3 text-sm leading-relaxed">
                Most calendar apps poll every 15 to 60 minutes. New bookings
                appear automatically; cancellations clear within the next poll.
              </p>
            </div>
            <div className="border border-[var(--color-border)] p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-muted)]">
                Privacy
              </p>
              <p className="mt-3 text-sm leading-relaxed">
                Each link has a per-month signed token. Anyone with the URL can
                read your bookings until the token rotates, so do not paste it
                publicly. Reset by signing out and back in.
              </p>
            </div>
          </div>

          <p className="mt-12 text-sm text-[var(--color-fg-muted)]">
            <Link href="/me" className="underline hover:text-court">
              Back to profile
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
