import type { NextRequest } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import * as React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';

import {
  clubStaff,
  tournamentMatches,
  tournamentRegistrations,
  tournamentRounds,
  tournaments,
  users,
} from '@feera/db';
import { db } from '@feera/db/client';
import { getSession } from '@/lib/api/request-context';
import { forbidden, notFound, serverError, unauthorized } from '@/lib/api/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string }>;
}

const COURT_GREEN = '#3F6B4E';
const INK = '#1a1a1a';
const PAPER = '#FAF7F0';
const MUTED = '#7a7a7a';
const BRASS = '#a68c5e';

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    padding: 36,
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 12,
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 28,
    color: INK,
  },
  meta: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  formatTag: {
    marginTop: 6,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: BRASS,
  },
  body: {
    flexGrow: 1,
  },
  roundColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  roundHeader: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 8,
  },
  matchCard: {
    borderWidth: 0.5,
    borderColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  matchCardWinner: {
    borderWidth: 1.5,
    borderColor: COURT_GREEN,
    backgroundColor: '#EFF5EE',
  },
  team: {
    fontSize: 10,
    paddingVertical: 2,
  },
  teamWinner: {
    fontWeight: 'bold',
    color: COURT_GREEN,
  },
  teamSep: {
    fontSize: 8,
    color: MUTED,
  },
  rowFlex: {
    flexDirection: 'row',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: MUTED,
  },
  footerUrl: {
    fontSize: 9,
    color: MUTED,
  },
  qr: {
    width: 56,
    height: 56,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: INK,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: '#dcdcdc',
  },
  th: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: MUTED,
  },
  td: {
    fontSize: 10,
    color: INK,
  },
});

interface TeamInfo {
  registrationId: string;
  teamLabel: string;
}

interface MatchView {
  id: string;
  roundOrdinal: number;
  teamA: TeamInfo | null;
  teamB: TeamInfo | null;
  teamASetsWon: number | null;
  teamBSetsWon: number | null;
  status: string;
}

interface RoundView {
  ordinal: number;
  name: string;
  matches: MatchView[];
}

function teamLabel(reg: {
  teamName: string | null;
  userId: string;
  partnerUserId: string | null;
}, userMap: Map<string, string>): string {
  if (reg.teamName) return reg.teamName;
  const a = userMap.get(reg.userId) ?? reg.userId.slice(0, 6);
  const b = reg.partnerUserId ? userMap.get(reg.partnerUserId) ?? reg.partnerUserId.slice(0, 6) : null;
  return b ? `${a} / ${b}` : a;
}

function MatchCard({ m }: { m: MatchView }) {
  const aWon =
    m.teamASetsWon !== null && m.teamBSetsWon !== null && m.teamASetsWon > m.teamBSetsWon;
  const bWon =
    m.teamASetsWon !== null && m.teamBSetsWon !== null && m.teamBSetsWon > m.teamASetsWon;
  const isFinal = m.status === 'completed';
  return React.createElement(
    View,
    { style: [styles.matchCard, isFinal ? styles.matchCardWinner : {}] },
    React.createElement(
      Text,
      { style: [styles.team, aWon ? styles.teamWinner : {}] },
      `${m.teamA?.teamLabel ?? 'TBD'}${m.teamASetsWon !== null ? `  ${m.teamASetsWon}` : ''}`,
    ),
    React.createElement(Text, { style: styles.teamSep }, 'vs'),
    React.createElement(
      Text,
      { style: [styles.team, bWon ? styles.teamWinner : {}] },
      `${m.teamB?.teamLabel ?? 'TBD'}${m.teamBSetsWon !== null ? `  ${m.teamBSetsWon}` : ''}`,
    ),
  );
}

function BracketDoc(props: {
  tournament: typeof tournaments.$inferSelect;
  rounds: RoundView[];
  qrDataUrl: string;
  publicUrl: string;
  isLandscape: boolean;
}) {
  const { tournament, rounds, qrDataUrl, publicUrl, isLandscape } = props;
  const startStr = new Date(tournament.startAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endStr = new Date(tournament.endAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const venue = tournament.city ?? tournament.countryCode;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: isLandscape ? 'landscape' : 'portrait', style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, tournament.name),
        React.createElement(
          Text,
          { style: styles.meta },
          `${venue}  .  ${startStr === endStr ? startStr : `${startStr} - ${endStr}`}`,
        ),
        React.createElement(
          Text,
          { style: styles.formatTag },
          tournament.format.replace(/_/g, ' '),
        ),
      ),
      React.createElement(
        View,
        { style: [styles.body, styles.rowFlex] },
        ...rounds.map((r) =>
          React.createElement(
            View,
            { style: styles.roundColumn, key: r.ordinal },
            React.createElement(Text, { style: styles.roundHeader }, r.name),
            ...r.matches.map((m) =>
              React.createElement(MatchCard, { m, key: m.id }),
            ),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerUrl }, publicUrl),
        React.createElement(Image, { src: qrDataUrl, style: styles.qr }),
      ),
    ),
  );
}

function StandingsTableDoc(props: {
  tournament: typeof tournaments.$inferSelect;
  standings: Array<{ rank: number; team: string; wins: number; losses: number; played: number; points: number }>;
  qrDataUrl: string;
  publicUrl: string;
  isLandscape: boolean;
}) {
  const { tournament, standings, qrDataUrl, publicUrl, isLandscape } = props;
  const startStr = new Date(tournament.startAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const venue = tournament.city ?? tournament.countryCode;
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: isLandscape ? 'landscape' : 'portrait', style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, tournament.name),
        React.createElement(Text, { style: styles.meta }, `${venue}  .  ${startStr}`),
        React.createElement(
          Text,
          { style: styles.formatTag },
          tournament.format.replace(/_/g, ' '),
        ),
      ),
      React.createElement(
        View,
        { style: styles.body },
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.th, { width: '8%' }] }, '#'),
          React.createElement(Text, { style: [styles.th, { width: '52%' }] }, 'Team'),
          React.createElement(Text, { style: [styles.th, { width: '10%', textAlign: 'right' }] }, 'P'),
          React.createElement(Text, { style: [styles.th, { width: '10%', textAlign: 'right' }] }, 'W'),
          React.createElement(Text, { style: [styles.th, { width: '10%', textAlign: 'right' }] }, 'L'),
          React.createElement(Text, { style: [styles.th, { width: '10%', textAlign: 'right' }] }, 'Pts'),
        ),
        ...standings.map((s) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: `${s.rank}-${s.team}` },
            React.createElement(Text, { style: [styles.td, { width: '8%' }] }, String(s.rank)),
            React.createElement(
              Text,
              {
                style: [styles.td, { width: '52%' }, s.rank === 1 ? { color: COURT_GREEN, fontFamily: 'Times-Bold' } : {}],
              },
              s.team,
            ),
            React.createElement(Text, { style: [styles.td, { width: '10%', textAlign: 'right' }] }, String(s.played)),
            React.createElement(Text, { style: [styles.td, { width: '10%', textAlign: 'right' }] }, String(s.wins)),
            React.createElement(Text, { style: [styles.td, { width: '10%', textAlign: 'right' }] }, String(s.losses)),
            React.createElement(Text, { style: [styles.td, { width: '10%', textAlign: 'right' }] }, String(s.points)),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerUrl }, publicUrl),
        React.createElement(Image, { src: qrDataUrl, style: styles.qr }),
      ),
    ),
  );
}

async function isAuthorized(
  tournament: typeof tournaments.$inferSelect,
  userId: string | null,
  role: string | null,
): Promise<boolean> {
  if (tournament.status === 'completed') return true;
  if (!userId) return false;
  if (role === 'platform_admin') return true;
  if (tournament.organizerUserId === userId) return true;
  if (tournament.clubId) {
    const staff = await db
      .select({ id: clubStaff.id })
      .from(clubStaff)
      .where(and(eq(clubStaff.clubId, tournament.clubId), eq(clubStaff.userId, userId)))
      .limit(1);
    if (staff.length > 0) return true;
  }
  const reg = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournament.id),
        eq(tournamentRegistrations.userId, userId),
      ),
    )
    .limit(1);
  return reg.length > 0;
}

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!t) return notFound(`Tournament "${id}" not found.`);

    const session = await getSession();
    const allowed = await isAuthorized(t, session?.userId ?? null, session?.role ?? null);
    if (!allowed) {
      if (!session) return unauthorized();
      return forbidden('Bracket PDF is restricted to organizers, club staff, and registered players until the tournament is completed.');
    }

    // Load rounds + matches + registrations + user display names.
    const [rounds, regs, matches] = await Promise.all([
      db.select().from(tournamentRounds).where(eq(tournamentRounds.tournamentId, t.id)),
      db
        .select()
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, t.id)),
      db.select().from(tournamentMatches).where(eq(tournamentMatches.tournamentId, t.id)),
    ]);

    const userIds = Array.from(
      new Set(regs.flatMap((r) => [r.userId, r.partnerUserId].filter(Boolean) as string[])),
    );
    const userRows = userIds.length
      ? await db
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.id, u.displayName]));
    const regMap = new Map(regs.map((r) => [r.id, r]));
    const roundOrdinal = new Map(rounds.map((r) => [r.id, r.ordinal]));
    const roundName = new Map(rounds.map((r) => [r.id, r.name]));

    const slug = t.slug;
    const publicUrl = `feera.ai/play/tournaments/${slug}`;
    const qrDataUrl = await QRCode.toDataURL(`https://www.${publicUrl}`, {
      margin: 1,
      width: 240,
    });

    const isLandscape =
      t.format === 'round_robin' ||
      (t.format === 'single_elimination' && regs.length > 8) ||
      t.format === 'americano';

    let blob: Blob;

    if (t.format === 'round_robin' || t.format === 'americano') {
      // Standings table view.
      const standingsByReg = new Map<string, { wins: number; losses: number; played: number }>();
      for (const r of regs) standingsByReg.set(r.id, { wins: 0, losses: 0, played: 0 });
      for (const m of matches) {
        if (m.teamASetsWon === null || m.teamBSetsWon === null) continue;
        if (!m.teamARegistrationId || !m.teamBRegistrationId) continue;
        const a = standingsByReg.get(m.teamARegistrationId);
        const b = standingsByReg.get(m.teamBRegistrationId);
        if (!a || !b) continue;
        a.played += 1;
        b.played += 1;
        if (m.teamASetsWon > m.teamBSetsWon) {
          a.wins += 1;
          b.losses += 1;
        } else {
          b.wins += 1;
          a.losses += 1;
        }
      }
      const standings = regs
        .map((r) => {
          const s = standingsByReg.get(r.id) ?? { wins: 0, losses: 0, played: 0 };
          return {
            team: teamLabel(r, userMap),
            wins: s.wins,
            losses: s.losses,
            played: s.played,
            points: s.wins * 3,
          };
        })
        .sort((x, y) => y.points - x.points || y.wins - x.wins)
        .map((s, idx) => ({ rank: idx + 1, ...s }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blob = await pdf(
        React.createElement(StandingsTableDoc as any, {
          tournament: t,
          standings,
          qrDataUrl,
          publicUrl,
          isLandscape,
        }) as any,
      ).toBlob();
    } else {
      // Knockout / single_elimination bracket.
      const byRound = new Map<number, MatchView[]>();
      for (const m of matches) {
        const ord = m.roundId ? roundOrdinal.get(m.roundId) ?? 1 : 1;
        const list = byRound.get(ord) ?? [];
        const aReg = m.teamARegistrationId ? regMap.get(m.teamARegistrationId) ?? null : null;
        const bReg = m.teamBRegistrationId ? regMap.get(m.teamBRegistrationId) ?? null : null;
        list.push({
          id: m.id,
          roundOrdinal: ord,
          teamA: aReg ? { registrationId: aReg.id, teamLabel: teamLabel(aReg, userMap) } : null,
          teamB: bReg ? { registrationId: bReg.id, teamLabel: teamLabel(bReg, userMap) } : null,
          teamASetsWon: m.teamASetsWon,
          teamBSetsWon: m.teamBSetsWon,
          status: m.status,
        });
        byRound.set(ord, list);
      }
      const roundViews: RoundView[] = Array.from(byRound.entries())
        .sort(([a], [b]) => a - b)
        .map(([ord, ms]) => ({
          ordinal: ord,
          name:
            Array.from(rounds).find((r) => r.ordinal === ord)
              ? roundName.get(rounds.find((r) => r.ordinal === ord)!.id) ?? `Round ${ord}`
              : `Round ${ord}`,
          matches: ms,
        }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blob = await pdf(
        React.createElement(BracketDoc as any, {
          tournament: t,
          rounds: roundViews,
          qrDataUrl,
          publicUrl,
          isLandscape,
        }) as any,
      ).toBlob();
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(buffer.byteLength),
        'content-disposition': `attachment; filename="feera-bracket-${slug}.pdf"`,
        'cache-control': t.status === 'completed' ? 'public, max-age=3600' : 'no-store',
      },
    });
  } catch (err) {
    return serverError('tournaments/[id]/bracket.pdf:GET', err);
  }
}
