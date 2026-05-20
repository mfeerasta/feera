/**
 * Hand-rolled VCALENDAR generator for the user's upcoming bookings.
 * Output validates against RFC 5545 well enough for Apple Calendar,
 * Google Calendar and Outlook subscription feeds.
 */

import { createHash } from 'node:crypto';

export interface IcsBooking {
  id: string;
  startAt: Date;
  endAt: Date;
  clubName: string;
  courtName: string;
  address: string | null;
  organizerName: string;
  participantNames: string[];
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as UTC YYYYMMDDTHHMMSSZ (RFC 5545 form #2). */
export function formatIcsUtc(d: Date): string {
  return (
    String(d.getUTCFullYear()) +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    'T' +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape commas, semicolons, backslashes and newlines for ICS text fields. */
export function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Fold long lines at 75 octets per RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 74) {
    out += '\r\n ' + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  if (rest.length > 0) out += '\r\n ' + rest;
  return out;
}

export interface BuildIcsOptions {
  /** Reference time used for DTSTAMP. Defaults to now. */
  now?: Date;
  /** Domain used for UID suffix. */
  domain?: string;
}

export function buildIcs(
  bookings: IcsBooking[],
  options: BuildIcsOptions = {},
): string {
  const now = options.now ?? new Date();
  const domain = options.domain ?? 'feera.ai';
  const stamp = formatIcsUtc(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Feera//Feera Player Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Feera bookings',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const b of bookings) {
    const summary = `${b.clubName} - ${b.courtName}`;
    const description = [
      `Organizer: ${b.organizerName}`,
      b.participantNames.length > 0
        ? `Players: ${b.participantNames.join(', ')}`
        : null,
    ]
      .filter((s): s is string => Boolean(s))
      .join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${b.id}@${domain}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatIcsUtc(b.startAt)}`);
    lines.push(`DTEND:${formatIcsUtc(b.endAt)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (b.address) lines.push(`LOCATION:${escapeIcsText(b.address)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Calendar feed signed token. Bound to the user, a server secret, and the
 * current calendar month so that links rotate monthly without storing state.
 */
export function calendarFeedToken(
  userId: string,
  secret: string,
  ref: Date = new Date(),
): string {
  const month = `${ref.getUTCFullYear()}-${pad2(ref.getUTCMonth() + 1)}`;
  return createHash('sha256')
    .update(`${userId}|${secret}|${month}`)
    .digest('hex');
}

/** Allow current month + previous month tokens to keep subscriptions warm at the rollover. */
export function isValidCalendarFeedToken(
  token: string,
  userId: string,
  secret: string,
  now: Date = new Date(),
): boolean {
  if (!token || token.length !== 64) return false;
  if (token === calendarFeedToken(userId, secret, now)) return true;
  const prev = new Date(now);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  return token === calendarFeedToken(userId, secret, prev);
}
