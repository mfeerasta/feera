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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={'/admin/clubs' as never}
        className="text-sm text-feera-court underline"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Club: {slug}</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Detail view + court management ships in M3. Use the API for now:
      </p>
      <pre className="mt-4 overflow-x-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
{`GET    /api/v1/clubs/${slug}
PATCH  /api/v1/clubs/${slug}
GET    /api/v1/clubs/${slug}/courts
POST   /api/v1/clubs/${slug}/courts`}
      </pre>
    </main>
  );
}
