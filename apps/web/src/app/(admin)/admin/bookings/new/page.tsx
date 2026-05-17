import Link from 'next/link';
import { gateAdmin } from '@/lib/admin/gate';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const inputCls =
  'h-11 rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep focus:border-court focus:outline-none';

const eyebrow =
  'text-[10px] uppercase tracking-[0.2em] text-ink-deep/60';

/**
 * Manual booking entry for walk-ins or phone bookings.
 */
export default async function NewBookingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  async function createBookingAction(formData: FormData): Promise<void> {
    'use server';
    const { adminFetch } = await import('@/lib/admin/api-client');
    const { redirect } = await import('next/navigation');

    const courtId = String(formData.get('courtId') ?? '').trim();
    const organizerUserId =
      String(formData.get('organizerUserId') ?? '').trim() || undefined;
    const startAtRaw = String(formData.get('startAt') ?? '').trim();
    const durationMinutesRaw = String(formData.get('durationMinutes') ?? '90').trim();
    const notes = String(formData.get('notes') ?? '').trim() || undefined;
    const startAt = new Date(startAtRaw).toISOString();
    const durationMinutes = Number(durationMinutesRaw) || 90;

    const res = await adminFetch('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        courtId,
        organizerUserId,
        startAt,
        durationMinutes,
        notes,
      }),
    });
    if (!res.ok) {
      const msg = await res.text();
      const url = `/admin/bookings/new?error=${encodeURIComponent(msg.slice(0, 200))}`;
      redirect(url);
    }
    const json = (await res.json()) as { data: { id: string } };
    redirect(`/admin/bookings/${json.data.id}`);
  }

  const error = (sp as Record<string, string | undefined>).error;

  return (
    <section className="mx-auto max-w-2xl">
      <Link
        href={'/admin/bookings' as never}
        className="text-xs uppercase tracking-[0.2em] text-ink-deep/60 transition-colors duration-150 hover:text-court"
      >
        Back to bookings
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        Operations
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">New booking</h1>
      <p className="mt-2 text-sm text-ink-deep/70">
        Walk-in or phone booking. Court conflict and pricing are resolved on submit.
      </p>

      {error ? (
        <p className="mt-4 border border-red-500/40 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <form action={createBookingAction} className="mt-8 space-y-5 text-sm">
        <label className="flex flex-col gap-2">
          <span className={eyebrow}>Court ID</span>
          <input name="courtId" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={eyebrow}>Organizer user ID</span>
          <input
            name="organizerUserId"
            placeholder="leave blank to bill to dev-admin"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={eyebrow}>Start time</span>
          <input
            type="datetime-local"
            name="startAt"
            required
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={eyebrow}>Duration (minutes)</span>
          <input
            type="number"
            name="durationMinutes"
            defaultValue={90}
            min={30}
            max={300}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={eyebrow}>Notes</span>
          <textarea
            name="notes"
            rows={3}
            className="rounded-none border border-ink-deep/30 bg-transparent px-4 py-3 text-sm text-ink-deep focus:border-court focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-none border border-ink-deep bg-transparent px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
        >
          Create booking
        </button>
      </form>
    </section>
  );
}
