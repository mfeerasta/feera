import { describe, expect, it } from 'vitest';
import {
  buildIcs,
  calendarFeedToken,
  escapeIcsText,
  formatIcsUtc,
  isValidCalendarFeedToken,
} from '@/lib/calendar/ics';

const SAMPLE = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    startAt: new Date('2026-06-01T14:00:00Z'),
    endAt: new Date('2026-06-01T15:30:00Z'),
    clubName: 'Padel Lahore DHA',
    courtName: 'Court 2',
    address: '12 Z Block, Phase 5, Lahore',
    organizerName: 'Aisha K.',
    participantNames: ['Aisha K.', 'Rami Z.', 'Sara M.', 'Bilal N.'],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    startAt: new Date('2026-06-03T08:00:00Z'),
    endAt: new Date('2026-06-03T09:00:00Z'),
    clubName: 'Reform DXB',
    courtName: 'Centre Court',
    address: null,
    organizerName: 'Omar',
    participantNames: [],
  },
];

describe('ics format helpers', () => {
  it('formats dates as UTC compact form', () => {
    expect(formatIcsUtc(new Date('2026-06-01T14:05:09Z'))).toBe('20260601T140509Z');
  });

  it('escapes commas, semicolons, backslashes, newlines', () => {
    expect(escapeIcsText('A, B; C\\D\nE')).toBe('A\\, B\\; C\\\\D\\nE');
  });
});

describe('buildIcs', () => {
  const now = new Date('2026-05-20T10:00:00Z');
  const ics = buildIcs(SAMPLE, { now });

  it('emits VCALENDAR wrapper', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Feera//Feera Player Calendar//EN');
  });

  it('emits one VEVENT per booking', () => {
    const matches = ics.match(/BEGIN:VEVENT/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('uses booking id + domain as UID', () => {
    expect(ics).toContain('UID:11111111-1111-4111-8111-111111111111@feera.ai');
  });

  it('includes DTSTART/DTEND in UTC compact form', () => {
    expect(ics).toContain('DTSTART:20260601T140000Z');
    expect(ics).toContain('DTEND:20260601T153000Z');
  });

  it('escapes commas in LOCATION text', () => {
    expect(ics).toContain('LOCATION:12 Z Block\\, Phase 5\\, Lahore');
  });

  it('uses club + court as SUMMARY', () => {
    expect(ics).toContain('SUMMARY:Padel Lahore DHA - Court 2');
  });

  it('omits LOCATION when address is null', () => {
    expect(ics).not.toContain('LOCATION:Reform');
  });

  it('emits DESCRIPTION with organizer + players', () => {
    expect(ics).toContain('DESCRIPTION:Organizer: Aisha K.\\nPlayers: Aisha K.\\, Rami Z.\\, Sara M.\\, Bilal N.');
  });

  it('emits DESCRIPTION with just organizer when no participants', () => {
    expect(ics).toContain('DESCRIPTION:Organizer: Omar');
  });

  it('produces parseable line-folded output (no line > 75 octets unless first)', () => {
    for (const line of ics.split('\r\n')) {
      // Continuation lines start with a single space; allow them.
      if (line.startsWith(' ')) continue;
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});

describe('calendar feed token', () => {
  it('produces deterministic 64-char hex per (user, secret, month)', () => {
    const t = calendarFeedToken('user-1', 'secret', new Date('2026-05-20T00:00:00Z'));
    expect(t).toMatch(/^[a-f0-9]{64}$/);
    expect(t).toBe(
      calendarFeedToken('user-1', 'secret', new Date('2026-05-21T23:59:00Z')),
    );
  });

  it('rotates between months', () => {
    const may = calendarFeedToken('user-1', 'secret', new Date('2026-05-20T00:00:00Z'));
    const jun = calendarFeedToken('user-1', 'secret', new Date('2026-06-01T00:00:00Z'));
    expect(may).not.toBe(jun);
  });

  it('validates current and prior month tokens', () => {
    const now = new Date('2026-06-05T00:00:00Z');
    const prev = calendarFeedToken('u', 'secret', new Date('2026-05-15T00:00:00Z'));
    const cur = calendarFeedToken('u', 'secret', now);
    expect(isValidCalendarFeedToken(cur, 'u', 'secret', now)).toBe(true);
    expect(isValidCalendarFeedToken(prev, 'u', 'secret', now)).toBe(true);
    expect(isValidCalendarFeedToken('x'.repeat(64), 'u', 'secret', now)).toBe(false);
    expect(isValidCalendarFeedToken('short', 'u', 'secret', now)).toBe(false);
  });
});
