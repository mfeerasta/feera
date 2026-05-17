import { gateAdmin } from '@/lib/admin/gate';
import { Button } from '@/components/ui/button';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

export default async function NewTournamentPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  return (
    <section className="mx-auto max-w-2xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">New event</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Create tournament</h1>
      </header>

      <form action="/api/v1/tournaments" method="post" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-ink-deep/80">Name</span>
            <input
              name="name"
              required
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Slug</span>
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Club id (optional)</span>
            <input
              name="clubId"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Format</span>
            <select
              name="format"
              required
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            >
              <option value="americano">Americano</option>
              <option value="mexicano">Mexicano</option>
              <option value="round_robin">Round robin</option>
              <option value="single_elimination">Single elimination</option>
              <option value="king_of_the_court">King of the court</option>
              <option value="pplp">PPLP</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Country code</span>
            <input
              name="countryCode"
              required
              maxLength={2}
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">City</span>
            <input
              name="city"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Starts at</span>
            <input
              name="startAt"
              type="datetime-local"
              required
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Ends at</span>
            <input
              name="endAt"
              type="datetime-local"
              required
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Registration closes at</span>
            <input
              name="registrationClosesAt"
              type="datetime-local"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Entry fee</span>
            <input
              name="entryFee"
              type="number"
              step="0.01"
              defaultValue="0"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Currency</span>
            <input
              name="currency"
              required
              maxLength={3}
              defaultValue="PKR"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Min level</span>
            <input
              name="minLevel"
              type="number"
              step="0.1"
              min="0"
              max="7"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Max level</span>
            <input
              name="maxLevel"
              type="number"
              step="0.1"
              min="0"
              max="7"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-deep/80">Gender preference</span>
            <select
              name="genderPreference"
              className="mt-2 w-full border border-ink-deep/20 bg-paper px-3 py-2 text-sm"
            >
              <option value="open">Open</option>
              <option value="men_only">Men only</option>
              <option value="women_only">Women only</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>
        <Button type="submit" variant="inverted">
          Create
        </Button>
      </form>
    </section>
  );
}
