import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { fetchChatThread, isChatMember, markChatRead } from '@/lib/chats/service';
import { MessageInput } from './message-input';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conversation — Feera',
};

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatThreadPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/messages');
  const { chatId } = await params;

  const data = await withRequestContext(session, async (tx) => {
    const member = await isChatMember(tx, chatId, session.userId);
    if (!member) return null;
    const thread = await fetchChatThread(tx, chatId);
    if (thread) {
      await markChatRead(tx, chatId, session.userId, new Date());
    }
    return thread;
  });

  if (!data) {
    return (
      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="font-serif text-xl text-[var(--color-fg-muted)]">
            Conversation not found
          </p>
          <Link
            href="/play/messages"
            className="mt-4 inline-block text-sm text-court hover:underline"
          >
            Back to messages
          </Link>
        </div>
      </section>
    );
  }

  const otherMember = data.members.find((m) => m.userId !== session.userId);
  const otherName = otherMember?.displayName ?? 'Unknown';
  const senderNames = new Map(data.members.map((m) => [m.userId, m.displayName]));

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <Link
            href="/play/messages"
            className="text-xs uppercase tracking-[0.2em] text-cream/60 hover:text-cream"
          >
            Back to messages
          </Link>
          <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">
            {otherName}
          </h1>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex flex-col gap-3">
            {data.messages.length === 0 ? (
              <p className="border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-fg-muted)]">
                No messages yet. Say hello!
              </p>
            ) : (
              data.messages.map((msg) => {
                const isOwn = msg.senderUserId === session.userId;
                const senderName = msg.senderUserId
                  ? senderNames.get(msg.senderUserId) ?? 'Unknown'
                  : 'System';
                const time = new Date(msg.createdAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={msg.id}
                    className={
                      'flex flex-col max-w-[75%] ' +
                      (isOwn ? 'ms-auto items-end' : 'me-auto items-start')
                    }
                  >
                    <div
                      className={
                        'border px-4 py-3 ' +
                        (isOwn
                          ? 'border-court/30 bg-court/10'
                          : 'border-[var(--color-border)] bg-[var(--color-bg-card)]')
                      }
                    >
                      {!isOwn ? (
                        <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-[var(--color-fg-muted)]">
                          {senderName}
                        </p>
                      ) : null}
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                    </div>
                    <span className="mt-1 text-[10px] text-[var(--color-fg-muted)]">
                      {time}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 border-t border-[var(--color-border)] pt-6">
            <MessageInput chatId={chatId} />
          </div>
        </div>
      </section>
    </>
  );
}
