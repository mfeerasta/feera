import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Club detail + edit. M2 stub — list, court sub-table, and inline edit land in M3.
 */
export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href={'/admin/clubs' as never}
        className="text-xs uppercase tracking-[0.2em] text-ink-deep/60 transition-colors duration-150 hover:text-court"
      >
        Back
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        Club
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{slug}</h1>
      <p className="mt-4 text-sm text-ink-deep/70">
        Detail view + court management ships in M3. Use the API for now:
      </p>
      <pre className="mt-6 overflow-x-auto border border-ink-deep/20 bg-ink-deep p-4 text-xs text-cream">
{`GET    /api/v1/clubs/${slug}
PATCH  /api/v1/clubs/${slug}
GET    /api/v1/clubs/${slug}/courts
POST   /api/v1/clubs/${slug}/courts`}
      </pre>
    </section>
  );
}
