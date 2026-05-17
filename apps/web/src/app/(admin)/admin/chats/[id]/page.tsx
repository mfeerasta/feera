import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatComposer } from './chat-composer';

interface ChatMessage {
  id: string;
  senderUserId: string | null;
  body: string | null;
  kind: string;
  createdAt: string;
}

interface ChatMember {
  userId: string;
  role: string;
  displayName: string;
  lastReadAt: string | null;
}

interface ChatThread {
  chat: { id: string; type: string; title: string | null };
  members: ChatMember[];
  messages: ChatMessage[];
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ChatThreadPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { id } = await params;

  const res = await adminFetch(`/api/v1/chats/${id}`);
  if (!res.ok) {
    return (
      <p className="text-sm text-red-600">Failed to load chat (HTTP {res.status}).</p>
    );
  }
  const json = (await res.json()) as { data: ChatThread };
  const thread = json.data;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
          Thread
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          {thread.chat.title ?? `${thread.chat.type} chat`}
        </h1>
        <p className="mt-2 text-sm text-ink-deep/60">
          {thread.members.length} member{thread.members.length === 1 ? '' : 's'}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-wrap gap-2 text-xs">
            {thread.members.map((m) => (
              <li
                key={m.userId}
                className="border border-ink-deep/20 px-3 py-1 text-ink-deep/80"
              >
                {m.displayName} ({m.role})
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardBody>
          {thread.messages.length === 0 ? (
            <p className="text-sm text-ink-deep/60">No messages yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {thread.messages.map((m) => (
                <li
                  key={m.id}
                  className="border border-ink-deep/10 bg-cream p-3"
                >
                  <div className="text-[10px] uppercase tracking-[0.15em] text-ink-deep/50">
                    {m.senderUserId ?? 'system'} |{' '}
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                  <p className="mt-2 text-sm text-ink-deep">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ChatComposer chatId={id} />
    </section>
  );
}
