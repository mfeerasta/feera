import Link from 'next/link';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatRow {
  id: string;
  type: string;
  title: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessagePreview: string | null;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminChatsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const res = await adminFetch('/api/v1/chats?limit=100');
  let chats: ChatRow[] = [];
  if (res.ok) {
    const json = (await res.json()) as { data: ChatRow[] };
    chats = json.data;
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Operations
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Chats</h1>
        <p className="mt-2 text-sm text-ink-deep/60">{chats.length} threads</p>
      </div>
      {chats.length === 0 ? (
        <p className="text-sm text-ink-deep/60">No chats yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {chats.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/chats/${c.id}`}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{c.title ?? `${c.type} chat`}</CardTitle>
                      {c.unreadCount > 0 ? (
                        <span className="border border-court px-2 py-0.5 text-xs text-court">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="line-clamp-1 text-sm text-ink-deep/80">
                      {c.lastMessagePreview ?? '(no messages yet)'}
                    </p>
                    <p className="text-xs text-ink-deep/50">
                      {c.lastMessageAt
                        ? new Date(c.lastMessageAt).toLocaleString()
                        : ''}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
