import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';

interface DocEntry {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  version: number | null;
  updatedAt: string | null;
  createdAt: string | null;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const CATEGORY_ORDER = ['template', 'guide', 'reference'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  template: 'Template',
  guide: 'Guide',
  reference: 'Reference',
};

const CATEGORY_COLORS: Record<string, string> = {
  template: 'border-court text-court',
  guide: 'border-blue-500 text-blue-600',
  reference: 'border-amber-500 text-amber-600',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupByCategory(docs: DocEntry[]): Map<string, DocEntry[]> {
  const groups = new Map<string, DocEntry[]>();
  for (const cat of CATEGORY_ORDER) {
    groups.set(cat, []);
  }
  for (const doc of docs) {
    const cat = doc.category ?? 'guide';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(doc);
  }
  // Remove empty categories
  for (const [key, val] of groups) {
    if (val.length === 0) groups.delete(key);
  }
  return groups;
}

export default async function CourtsDocsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/docs');
  let docs: DocEntry[] = [];
  let error: string | null = null;

  if (res.ok) {
    const json = (await res.json()) as { data: DocEntry[] };
    docs = json.data;
  } else {
    error = `Failed to load documents (HTTP ${res.status}).`;
  }

  const grouped = groupByCategory(docs);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Courts Business
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          Documents Library
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          Internal templates, guides, and reference materials for the Courts
          vertical.
        </p>
      </div>

      {error ? (
        <p className="mb-8 text-sm text-red-600">{error}</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-deep/60">
              No documents yet. Seed the database or create documents via the
              API to populate this library.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-4 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
                {CATEGORY_LABELS[category] ?? category}s
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => (
                  <Card key={doc.id}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${CATEGORY_COLORS[category] ?? 'border-ink-deep/20 text-ink-deep/50'}`}
                        >
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                        <span className="text-[10px] text-ink-deep/40">
                          v{doc.version ?? 1}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-lg leading-tight tracking-tight">
                        {doc.title}
                      </h3>
                      <p className="mt-2 text-xs text-ink-deep/40">
                        Updated {fmtDate(doc.updatedAt ?? doc.createdAt)}
                      </p>
                      <Link
                        href={`/admin/courts/docs/${doc.slug}`}
                        className="mt-4 inline-block text-sm text-court transition-colors duration-150 hover:text-court/80"
                      >
                        View &rarr;
                      </Link>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
