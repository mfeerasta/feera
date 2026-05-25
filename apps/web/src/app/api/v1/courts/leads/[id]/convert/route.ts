import { eq } from 'drizzle-orm';
import { courtsLeads, courtsDeals } from '@feera/db';
import { badRequest, notFound, ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const result = await withRequestContext(session, async (tx) => {
      const [lead] = await tx
        .select()
        .from(courtsLeads)
        .where(eq(courtsLeads.id, id))
        .limit(1);

      if (!lead) return { error: 'not_found' as const };

      if (lead.status === 'converted' && lead.convertedToDealId) {
        return { error: 'already_converted' as const };
      }

      const slugBase = toSlug(lead.company || lead.city || lead.name);
      const slug = `${slugBase}-${Date.now()}`;

      const deals = await tx
        .insert(courtsDeals)
        .values({
          projectName: lead.company || `${lead.name} project`,
          slug,
          city: lead.city,
          contactName: lead.name,
          contactEmail: lead.email,
          contactPhone: lead.phone,
          stage: 'lead',
          source: 'website',
          sourceDetail: lead.sourcePage,
          projectedCapex: parseCapexRange(lead.capexRange),
        })
        .returning();

      const newDeal = deals[0];
      if (!newDeal) throw new Error('Failed to create deal');

      await tx
        .update(courtsLeads)
        .set({ status: 'converted', convertedToDealId: newDeal.id })
        .where(eq(courtsLeads.id, id));

      return { dealId: newDeal.id };
    });

    if (result.error === 'not_found') return notFound('Lead not found.');
    if (result.error === 'already_converted') {
      return badRequest('This lead has already been converted to a deal.');
    }

    return ok({ dealId: result.dealId });
  } catch (err) {
    return serverError('courts/leads/[id]/convert:POST', err);
  }
}

/**
 * Best-effort parse of free-text capex range into a single integer.
 * Returns null when unparseable.
 */
function parseCapexRange(range: string | null | undefined): number | null {
  if (!range) return null;
  const numbers = range.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return null;
  const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ''), 10));
  // If there are two numbers (e.g. "$500k - $1M"), return the midpoint
  if (parsed.length >= 2) return Math.round(((parsed[0] ?? 0) + (parsed[1] ?? 0)) / 2);
  return parsed[0] ?? null;
}
