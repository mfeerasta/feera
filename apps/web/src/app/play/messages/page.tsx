import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { listUserChats, type ChatListItem } from '@/lib/chats/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Messages — Feera',
};

function otherMemberName(chat: ChatListItem, viewerId: string): string {
  const other = chat.members.find((m) => m.userId !== viewerId);
  return other?.displayName ?? 'Unknown';
}

function formatTime(d: Date | null): string {
  if (!d) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (hours < 24 * 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/messages');

  const chats = await withRequestContext(session, (tx) =>
    listUserChats(tx, session.userId, { limit: 50, offset: 0 }),
  );

  // Filter to DM chats only for the messages view.
  const dmChats = chats.filter((c) => c.type === 'direct');

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">
            Player
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Messages
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Direct messages with other players.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          {dmChats.length === 0 ? (
            <div className="border border-[var(--color-border)] px-6 py-16 text-center">
              <p className="font-serif text-xl text-[var(--color-fg-muted)]">
                No messages yet
              </p>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                Start a conversation from a player&apos;s profile.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
              {dmChats.map((chat) => {
                const name = otherMemberName(chat, session.userId);
                const initial = (name ?? '?').charAt(0).toUpperCase();
                return (
                  <li key={chat.id}>
                    <Link
                      href={`/play/messages/${chat.id}`}
                      className="feera-motion flex items-center gap-4 px-6 py-5 hover:bg-[var(--color-bg-card)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] font-serif text-base text-[var(--color-fg-muted)]">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif text-lg truncate">
                            {name}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--color-fg-muted)]">
                            {formatTime(chat.lastMessageAt)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-[var(--color-fg-muted)]">
                          {chat.lastMessagePreview ?? 'No messages yet'}
                        </p>
                      </div>
                      {chat.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-court px-1.5 text-[10px] font-bold text-cream">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
