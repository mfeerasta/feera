/**
 * Coach availability computation. Pure function so it can be unit-tested
 * without a DB. The marketplace endpoint composes this with persisted
 * coaching_sessions to surface bookable 30-minute slots.
 */

export const SLOT_MINUTES = 30;
const MS_PER_MIN = 60_000;

export type WeekdayKey =
  | 'sun'
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat';

const WEEKDAY_BY_INDEX: readonly WeekdayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

export interface WeeklyWindow {
  /** Local "HH:mm" (24h). */
  start: string;
  /** Local "HH:mm" (24h). End is exclusive. */
  end: string;
}

export type WeeklyAvailability = Partial<Record<WeekdayKey, WeeklyWindow[]>>;

export interface ExistingSession {
  startAt: Date;
  endAt: Date;
}

export interface AvailableSlot {
  startAt: Date;
  endAt: Date;
}

function parseHhMm(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function atUtcDayMinute(day: Date, hour: number, minute: number): Date {
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute, 0, 0),
  );
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Compute the available 30-minute slots over the next `windowDays` days for a
 * coach with the given weekly template, subtracting any existing sessions that
 * would block a slot.
 *
 * Boundary rules:
 *   - Windows are interpreted in UTC. Per-coach TZ lands in M5.
 *   - A slot is blocked if any portion of an existing session overlaps it.
 *     Back-to-back sessions (end equals next start) do not block each other.
 *   - All-day-off (no window for that weekday) yields no slots that day.
 *   - Partial windows are truncated to fit whole 30-minute boundaries inside
 *     the window. A 07:00 to 09:15 window yields four slots ending 09:00.
 *   - Past slots (startAt before the from cutoff) are filtered out.
 */
export function computeAvailableSlots(
  weekly: WeeklyAvailability,
  existing: ExistingSession[],
  windowDays: number,
  options?: { from?: Date },
): AvailableSlot[] {
  if (windowDays <= 0) return [];

  const from = options?.from ?? new Date();
  const fromDay = startOfUtcDay(from);
  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < windowDays; dayOffset += 1) {
    const day = new Date(fromDay.getTime() + dayOffset * 24 * 60 * MS_PER_MIN);
    const weekday = WEEKDAY_BY_INDEX[day.getUTCDay()]!;
    const windows = weekly[weekday];
    if (!windows || windows.length === 0) continue;

    for (const window of windows) {
      const start = parseHhMm(window.start);
      const end = parseHhMm(window.end);
      if (!start || !end) continue;
      const winStart = atUtcDayMinute(day, start.h, start.m);
      const winEnd = atUtcDayMinute(day, end.h, end.m);
      if (winEnd <= winStart) continue;

      for (
        let cursor = winStart.getTime();
        cursor + SLOT_MINUTES * MS_PER_MIN <= winEnd.getTime();
        cursor += SLOT_MINUTES * MS_PER_MIN
      ) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor + SLOT_MINUTES * MS_PER_MIN);
        if (slotStart < from) continue;
        const blocked = existing.some((s) => {
          const sStart = s.startAt.getTime();
          const sEnd = s.endAt.getTime();
          return sStart < slotEnd.getTime() && sEnd > slotStart.getTime();
        });
        if (!blocked) {
          slots.push({ startAt: slotStart, endAt: slotEnd });
        }
      }
    }
  }

  return slots;
}
