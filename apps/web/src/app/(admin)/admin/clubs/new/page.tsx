import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Club create form. M2 stub. Full form (name, slug, address, geo, amenities, currency)
 * lands in M3 alongside the file-upload UI for logos.
 */
export default function NewClubPage() {
  return (
    <section className="mx-auto max-w-2xl">
      <Link
        href={'/admin/clubs' as never}
        className="text-xs uppercase tracking-[0.2em] text-ink-deep/60 transition-colors duration-150 hover:text-court"
      >
        Back to clubs
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
        Operations
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">New club</h1>
      <p className="mt-4 text-sm text-ink-deep/70">
        Form lands in M3. For now create clubs via API:
      </p>
      <pre className="mt-6 overflow-x-auto border border-ink-deep/20 bg-ink-deep p-4 text-xs text-cream">
{`curl -X POST http://localhost:3000/api/v1/clubs \\
  -H 'content-type: application/json' \\
  -H 'x-feera-dev-admin: 1' \\
  -d '{"name":"Sample","slug":"sample","countryCode":"PK","city":"Lahore","defaultCurrency":"PKR"}'`}
      </pre>
    </section>
  );
}
