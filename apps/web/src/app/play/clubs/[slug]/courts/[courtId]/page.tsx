import Link from 'next/link';
import { notFound } from 'next/navigation';
import { playFetch } from '@/lib/play/api-client';
import { BookSlotForm } from './book-slot-form';

interface CourtRow {
  id: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  isClimateControlled: boolean;
  isPanoramic: boolean;
  isActive: boolean;
}

interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  courts: CourtRow[];
}

interface BookingRow {
  id: string;
  courtId: string;
  startAt: string;
  endAt: string;
  status: string;
  isOpenMatch: boolean;
  maxParticipants: number;
  seatsBooked?: number;
}

interface PageProps {
  params: Promise<{ slug: string; courtId: string }>;
}

const SLOT_MINUTES = 30;
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const DAYS_AHEAD = 7;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function localIsoLike(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface SlotInfo {
  state: 'free' | 'open' | 'booked' | 'past';
  bookingId?: string;
  seatsOpen?: number;
}

export default async function CourtCalendarPage({ params }: PageProps) {
  const { slug, courtId } = await params;

  const clubRes = await playFetch(`/api/v1/clubs/${encodeURIComponent(slug)}`);
  if (clubRes.status === 404) notFound();
  if (!clubRes.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load club (HTTP {clubRes.status}).
        </p>
      </section>
    );
  }
  const { data: club } = (await clubRes.json()) as { data: ClubDetail };
  const court = club.courts.find((c) => c.id === courtId);
  if (!court) notFound();

  const today = startOfDay(new Date());
  const days: Date[] = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const rangeStart = days[0]!;
  const rangeEnd = new Date(days[days.length - 1]!);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const bookingsRes = await playFetch(
    `/api/v1/bookings?courtId=${encodeURIComponent(courtId)}&from=${rangeStart.toISOString()}&to=${rangeEnd.toISOString()}&limit=200`,
  );
  let bookings: BookingRow[] = [];
  if (bookingsRes.ok) {
    const j = (await bookingsRes.json()) as { data: BookingRow[] };
    bookings = j.data.filter(
      (b) => b.status !== 'cancelled' && b.courtId === courtId,
    );
  }

  // Build slot map: key = `${dayIdx}:${slotIdx}` -> SlotInfo
  const slotsPerDay =
    ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
  const slots: Record<string, SlotInfo> = {};
  const now = new Date();

  for (let di = 0; di < days.length; di++) {
    for (let si = 0; si < slotsPerDay; si++) {
      const d = new Date(days[di]!);
      d.setHours(
        DAY_START_HOUR + Math.floor((si * SLOT_MINUTES) / 60),
        (si * SLOT_MINUTES) % 60,
        0,
        0,
      );
      const end = new Date(d.getTime() + SLOT_MINUTES * 60_000);
      const key = `${di}:${si}`;
      if (d < now) {
        slots[key] = { state: 'past' };
        continue;
      }
      const overlap = bookings.find((b) => {
        const bs = new Date(b.startAt).getTime();
        const be = new Date(b.endAt).getTime();
        return bs < end.getTime() && be > d.getTime();
      });
      if (!overlap) {
        slots[key] = { state: 'free' };
      } else {
        const max = overlap.maxParticipants ?? 4;
        const taken = overlap.seatsBooked ?? max;
        const seatsOpen = Math.max(0, max - taken);
        slots[key] =
          overlap.isOpenMatch && seatsOpen > 0
            ? { state: 'open', bookingId: overlap.id, seatsOpen }
            : { state: 'booked', bookingId: overlap.id };
      }
    }
  }

  // Build a flat list of slot starts for the client form to reference.
  const slotIndex: Array<{ dayIdx: number; slotIdx: number; iso: string }> = [];
  for (let di = 0; di < days.length; di++) {
    for (let si = 0; si < slotsPerDay; si++) {
      const d = new Date(days[di]!);
      d.setHours(
        DAY_START_HOUR + Math.floor((si * SLOT_MINUTES) / 60),
        (si * SLOT_MINUTES) % 60,
        0,
        0,
      );
      slotIndex.push({ dayIdx: di, slotIdx: si, iso: localIsoLike(d) });
    }
  }

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href={`/play/clubs/${club.slug}`}
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            ← {club.name}
          </Link>
          <h1 className="mt-4 font-serif text-5xl tracking-tight text-cream">
            {court.name}
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-cream/60">
            {court.surface.replace(/_/g, ' ')} ·{' '}
            {court.isIndoor ? 'Indoor' : 'Outdoor'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-cream/70">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 border border-cream/40 bg-court/60" />
              Free
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 border border-cream/40 bg-brass/60" />
              Open match
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 border border-cream/40 bg-cream/15" />
              Booked
            </span>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Next 7 days
          </p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight text-ink-deep">
            Pick a slot.
          </h2>

          <div className="mt-8 overflow-x-auto border border-ink-deep/15 bg-paper">
            <div
              className="grid min-w-[720px]"
              style={{
                gridTemplateColumns: `80px repeat(${days.length}, minmax(80px, 1fr))`,
              }}
            >
              {/* Header row */}
              <div className="border-b border-e border-ink-deep/15 bg-cream px-3 py-3 text-[10px] uppercase tracking-[0.18em] text-ink-deep/60">
                Time
              </div>
              {days.map((d, di) => (
                <div
                  key={di}
                  className="border-b border-e border-ink-deep/15 bg-cream px-3 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-ink-deep/70"
                >
                  {fmtDayLabel(d)}
                </div>
              ))}

              {/* Slot rows */}
              {Array.from({ length: slotsPerDay }, (_, si) => {
                const hour = DAY_START_HOUR + Math.floor((si * SLOT_MINUTES) / 60);
                const min = (si * SLOT_MINUTES) % 60;
                const isHourBoundary = min === 0;
                return (
                  <SlotRow
                    key={si}
                    si={si}
                    hour={hour}
                    min={min}
                    isHourBoundary={isHourBoundary}
                    days={days}
                    slots={slots}
                    clubSlug={club.slug}
                  />
                );
              })}
            </div>
          </div>

          <BookSlotForm
            courtId={courtId}
            slotIndex={slotIndex}
            clubSlug={club.slug}
          />
        </div>
      </section>
    </>
  );
}

interface RowProps {
  si: number;
  hour: number;
  min: number;
  isHourBoundary: boolean;
  days: Date[];
  slots: Record<string, SlotInfo>;
  clubSlug: string;
}

function SlotRow({
  si,
  hour,
  min,
  isHourBoundary,
  days,
  slots,
  clubSlug: _clubSlug,
}: RowProps) {
  return (
    <>
      <div
        className={`border-e border-ink-deep/10 px-3 py-2 text-[11px] tabular-nums text-ink-deep/60 ${
          isHourBoundary ? 'border-t border-ink-deep/15' : ''
        }`}
      >
        {isHourBoundary ? `${pad(hour)}:${pad(min)}` : ''}
      </div>
      {days.map((_, di) => {
        const info = slots[`${di}:${si}`];
        const base = `border-e border-ink-deep/10 ${
          isHourBoundary ? 'border-t border-ink-deep/15' : ''
        }`;
        if (!info || info.state === 'past') {
          return (
            <div
              key={di}
              className={`${base} h-7 cursor-not-allowed bg-cream/40`}
              aria-label="past"
            />
          );
        }
        if (info.state === 'booked') {
          return (
            <div
              key={di}
              className={`${base} h-7 cursor-not-allowed bg-ink-deep/10`}
              title="Already booked"
              aria-label="Already booked"
            />
          );
        }
        if (info.state === 'open' && info.bookingId) {
          return (
            <Link
              key={di}
              href={`/play/open/${info.bookingId}`}
              className={`${base} block h-7 bg-brass/30 transition-colors duration-150 hover:bg-brass/60`}
              title={`Open match · ${info.seatsOpen} seat${info.seatsOpen === 1 ? '' : 's'} open`}
            />
          );
        }
        return (
          <button
            key={di}
            type="button"
            data-slot-key={`${di}:${si}`}
            className={`${base} h-7 bg-court/20 transition-colors duration-150 hover:bg-court/60`}
            title={`Free · ${pad(hour)}:${pad(min)}`}
          />
        );
      })}
    </>
  );
}
