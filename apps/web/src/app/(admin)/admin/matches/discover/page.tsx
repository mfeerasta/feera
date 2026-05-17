import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

interface DiscoveredItem {
  match: {
    bookingId: string;
    clubName: string;
    startAt: string;
    endAt: string;
    requiredLevelMin: number;
    requiredLevelMax: number;
    genderPreference: string;
  };
  score: number;
  reasons: string[];
}

interface PageProps {
  searchParams: Promise<{
    admin?: string;
    radiusKm?: string;
    from?: string;
    to?: string;
    genderPreference?: string;
  }>;
}

export const dynamic = 'force-dynamic';

const filterInput =
  'rounded-none border border-ink-deep/30 bg-transparent px-3 py-2 text-sm text-ink-deep focus:border-court focus:outline-none';

export default async function DiscoverPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const params = new URLSearchParams();
  if (sp.radiusKm) params.set('radiusKm', sp.radiusKm);
  if (sp.from) params.set('from', sp.from);
  if (sp.to) params.set('to', sp.to);
  if (sp.genderPreference) params.set('genderPreference', sp.genderPreference);

  const res = await adminFetch(`/api/v1/matches/discover?${params.toString()}`);
  let items: DiscoveredItem[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: DiscoveredItem[] };
    items = json.data;
  } else {
    error = `Failed to load (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Discovery
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Open matches
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Ranked using @feera/matching/findPartners. {items.length} result
          {items.length === 1 ? '' : 's'}.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <form method="get" className="grid grid-cols-1 gap-5 md:grid-cols-4">
            <input type="hidden" name="admin" value={sp.admin ?? '1'} />
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-ink-deep/60">
              Radius (km)
              <input
                type="number"
                name="radiusKm"
                defaultValue={sp.radiusKm ?? '15'}
                min={1}
                max={200}
                className={filterInput}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-ink-deep/60">
              From
              <input
                type="datetime-local"
                name="from"
                defaultValue={sp.from ?? ''}
                className={filterInput}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-ink-deep/60">
              To
              <input
                type="datetime-local"
                name="to"
                defaultValue={sp.to ?? ''}
                className={filterInput}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-ink-deep/60">
              Gender pref
              <select
                name="genderPreference"
                defaultValue={sp.genderPreference ?? ''}
                className={filterInput}
              >
                <option value="">any</option>
                <option value="open">open</option>
                <option value="men_only">men_only</option>
                <option value="women_only">women_only</option>
                <option value="mixed">mixed</option>
              </select>
            </label>
            <button
              type="submit"
              className="md:col-span-4 inline-flex h-10 items-center justify-center rounded-none border border-ink-deep bg-transparent px-6 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court md:w-32"
            >
              Apply
            </button>
          </form>
        </CardBody>
      </Card>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-deep/60">No open matches found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((it) => (
            <Card key={it.match.bookingId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{it.match.clubName}</CardTitle>
                  <span
                    className="border border-court px-3 py-1 text-xs font-medium text-court"
                    title="Match score"
                  >
                    {(it.score * 100).toFixed(0)}
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-deep/80">
                  {new Date(it.match.startAt).toLocaleString()} to{' '}
                  {new Date(it.match.endAt).toLocaleString()}
                </p>
                <p className="text-xs text-ink-deep/50">
                  Level {it.match.requiredLevelMin.toFixed(1)} -{' '}
                  {it.match.requiredLevelMax.toFixed(1)} |{' '}
                  {it.match.genderPreference}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {it.reasons.map((r, i) => (
                    <li
                      key={i}
                      className="border border-ink-deep/20 px-3 py-1 text-xs text-ink-deep/70"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
