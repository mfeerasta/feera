import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import * as React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';

import { tournamentRegistrations, tournaments, users } from '@feera/db';
import { db } from '@feera/db/client';
import { withRequestContext, getSession } from '@/lib/api/request-context';
import { forbidden, notFound, serverError } from '@/lib/api/responses';
import { getStandings } from '@/lib/tournaments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: Promise<{ id: string; participantId: string }>;
}

const PAPER = '#FAF7F0';
const INK = '#1a1a1a';
const BRASS = '#a68c5e';
const MUTED = '#7a7a7a';

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    padding: 0,
    fontFamily: 'Times-Roman',
  },
  border: {
    flex: 1,
    margin: 24,
    borderWidth: 3,
    borderColor: BRASS,
    padding: 36,
    position: 'relative',
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 0.5,
    borderColor: BRASS,
  },
  hairline: {
    width: 80,
    height: 0.75,
    backgroundColor: BRASS,
    alignSelf: 'center',
    marginVertical: 14,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: BRASS,
    textAlign: 'center',
    marginTop: 36,
  },
  award: {
    fontFamily: 'Times-Bold',
    fontSize: 40,
    color: INK,
    textAlign: 'center',
    marginTop: 12,
  },
  awardedTo: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: MUTED,
    textAlign: 'center',
    marginTop: 36,
  },
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 64,
    color: INK,
    textAlign: 'center',
    marginTop: 14,
  },
  tournament: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: INK,
    textAlign: 'center',
    marginTop: 28,
  },
  venue: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  signatureBlock: {
    width: 240,
  },
  signatureLine: {
    height: 0.75,
    backgroundColor: INK,
    marginBottom: 6,
  },
  signatureLabel: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  issuer: {
    fontFamily: 'Times-Italic',
    fontSize: 11,
    color: INK,
    marginTop: 2,
  },
  qr: {
    width: 60,
    height: 60,
  },
});

function CertDoc(props: {
  title: string;
  displayName: string;
  tournamentName: string;
  venue: string;
  dateStr: string;
  qrDataUrl: string;
}) {
  const { title, displayName, tournamentName, venue, dateStr, qrDataUrl } = props;
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: 'portrait', style: styles.page },
      React.createElement(
        View,
        { style: styles.border },
        React.createElement(View, { style: styles.innerBorder }),
        React.createElement(Text, { style: styles.eyebrow }, 'Feera'),
        React.createElement(Text, { style: styles.award }, title),
        React.createElement(View, { style: styles.hairline }),
        React.createElement(Text, { style: styles.awardedTo }, 'Awarded to'),
        React.createElement(Text, { style: styles.name }, displayName),
        React.createElement(Text, { style: styles.tournament }, tournamentName),
        React.createElement(Text, { style: styles.venue }, `${venue}  .  ${dateStr}`),
        React.createElement(
          View,
          { style: styles.bottomRow },
          React.createElement(
            View,
            { style: styles.signatureBlock },
            React.createElement(View, { style: styles.signatureLine }),
            React.createElement(Text, { style: styles.signatureLabel }, 'Issued by Feera'),
            React.createElement(Text, { style: styles.issuer }, 'feera.ai'),
          ),
          React.createElement(Image, { src: qrDataUrl, style: styles.qr }),
        ),
      ),
    ),
  );
}

function titleForRank(rank: number): string {
  if (rank === 1) return 'Champion';
  if (rank === 2) return 'Runner-up';
  return 'Third Place';
}

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  try {
    const { id, participantId } = await ctx.params;
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!t) return notFound(`Tournament "${id}" not found.`);
    if (t.status !== 'completed') {
      return forbidden('Certificates become available once the tournament is completed.');
    }

    const session = await getSession();
    const standings = await withRequestContext(session, (tx) => getStandings(tx, t.id));
    if (!standings) return notFound('Standings not available.');

    const entry = standings.find((s) => s.participantId === participantId);
    if (!entry) return notFound('Participant not in tournament.');
    if (entry.rank > 3) {
      return forbidden('Certificates are issued for the top three finishers only.');
    }

    // Resolve the player whose certificate this is. participantId is a
    // registration id (engine's id-space). The certificate belongs to the
    // primary registrant; if a partner exists, the same registration covers
    // both but we issue one certificate per registration.
    const [reg] = await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, participantId))
      .limit(1);
    if (!reg) return notFound('Registration not found.');

    const [primary] = await db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, reg.userId))
      .limit(1);
    if (!primary) return notFound('Player not found.');

    const displayName = reg.teamName ?? primary.displayName;

    const profileUrl = `https://www.feera.ai/play/players/${primary.id}`;
    const qrDataUrl = await QRCode.toDataURL(profileUrl, { margin: 1, width: 240 });

    const startStr = new Date(t.startAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const venue = t.city ?? t.countryCode;

    const blob = await pdf(
      React.createElement(CertDoc, {
        title: titleForRank(entry.rank),
        displayName,
        tournamentName: t.name,
        venue,
        dateStr: startStr,
        qrDataUrl,
      }),
    ).toBlob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(buffer.byteLength),
        'content-disposition': `attachment; filename="feera-cert-${t.slug}-${participantId}.pdf"`,
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return serverError('tournaments/[id]/certificate/[participantId].pdf:GET', err);
  }
}
