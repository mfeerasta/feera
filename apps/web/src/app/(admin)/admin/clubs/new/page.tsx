import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Club create form. M2 stub. Full form (name, slug, address, geo, amenities, currency)
 * lands in M3 alongside the file-upload UI for logos.
 */
export default function NewClubPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">New club</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Form lands in M3. For now create clubs via API:
      </p>
      <pre className="mt-4 overflow-x-auto rounded bg-neutral-900 p-4 text-xs text-neutral-100">
{`curl -X POST http://localhost:3000/api/v1/clubs \\
  -H 'content-type: application/json' \\
  -H 'x-feera-dev-admin: 1' \\
  -d '{"name":"Sample","slug":"sample","countryCode":"PK","city":"Lahore","defaultCurrency":"PKR"}'`}
      </pre>
      <Link
        href={'/admin/clubs' as never}
        className="mt-6 inline-block text-sm text-feera-court underline"
      >
        Back to clubs
      </Link>
    </main>
  );
}
