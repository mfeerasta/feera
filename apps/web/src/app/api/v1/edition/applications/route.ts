import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, editionMemberships, users } from '@feera/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ApplicationSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^\+\d{6,15}$/).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().min(2).max(80),
  referrer: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  note: z.string().min(20).max(2000),
});

/**
 * Public Edition application endpoint. Creates or reuses a `users` row by email,
 * then inserts an `edition_memberships` row with status='applicant'.
 *
 * Review workflow + Telegram notification land with the M7 hermes skill
 * `edition-application-review`. For now we just persist + ack.
 */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'bad_request', message: 'Invalid JSON.' },
      { status: 400 },
    );
  }

  const parsed = ApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', message: parsed.error.message },
      { status: 400 },
    );
  }

  const data = parsed.data;
  try {
    const existing = await db
      .select({ id: users.id, editionStatus: users.editionMemberStatus })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    let userId: string;
    if (existing.length > 0 && existing[0]) {
      userId = existing[0].id;
      if (existing[0].editionStatus === 'active') {
        return NextResponse.json(
          {
            error: 'already_member',
            message: 'You are already an Edition member.',
          },
          { status: 409 },
        );
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: data.email,
          phone: data.phone ?? null,
          displayName: data.fullName,
          countryCode: 'XX',
          city: data.city,
          locale: 'en',
          editionMemberStatus: 'applicant',
        })
        .returning({ id: users.id });
      if (!created) {
        throw new Error('user_insert_failed');
      }
      userId = created.id;
    }

    await db.insert(editionMemberships).values({
      userId,
      status: 'applicant',
      tier: 'standard',
      annualFee: 1800,
      currency: 'USD',
      notes: `Referrer: ${data.referrer ?? '(none)'}`,
      applicationAnswers: {
        fullName: data.fullName,
        city: data.city,
        phone: data.phone ?? null,
        note: data.note,
        submittedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Application received.' },
      { status: 201 },
    );
  } catch (err) {
    console.error('[api/v1/edition/applications]', err);
    return NextResponse.json(
      { error: 'internal_error', message: 'Could not record application.' },
      { status: 500 },
    );
  }
}
