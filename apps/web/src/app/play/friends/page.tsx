import Link from 'next/link';
import { redirect } from 'next/navigation';
import { inArray } from 'drizzle-orm';
import { userRatings } from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { maskUsersForViewer, type Viewer } from '@/lib/api/user-serializer';
import {
  listBlocked,
  listFriends,
  listIncoming,
  listOutgoing,
  loadFriendIds,
  type FriendshipWithUser,
} from '@/lib/friends/service';
import {
  acceptAction,
  cancelAction,
  declineAction,
  unblockAction,
} from './actions';
import { AddFriendForm } from './add-friend-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Tab = 'accepted' | 'incoming' | 'outgoing' | 'blocked';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const TABS: Tab[] = ['accepted', 'incoming', 'outgoing', 'blocked'];

function parseTab(raw: string | undefined): Tab {
  return TABS.includes(raw as Tab) ? (raw as Tab) : 'accepted';
}

interface LoadedData {
  rows: FriendshipWithUser[];
  ratings: Map<string, { ratingDisplay: number; reliabilityPct: number; isProvisional: boolean }>;
  viewer: Viewer;
  counts: { accepted: number; incoming: number; outgoing: number; blocked: number };
}

async function loadTab(tab: Tab, viewerUserId: string): Promise<LoadedData> {
  const session = await getSession();
  return withRequestContext(session, async (tx) => {
    const [accepted, incoming, outgoing, blocked] = await Promise.all([
      listFriends(tx, viewerUserId),
      listIncoming(tx, viewerUserId),
      listOutgoing(tx, viewerUserId),
      listBlocked(tx, viewerUserId),
    ]);
    const rows =
      tab === 'incoming'
        ? incoming
        : tab === 'outgoing'
          ? outgoing
          : tab === 'blocked'
            ? blocked
            : accepted;

    const friendIdSet = await loadFriendIds(tx, viewerUserId);
    const userIds = rows.map((r) => r.other.id);
    const ratingsRows = userIds.length
      ? await tx
          .select({
            userId: userRatings.userId,
            ratingDisplay: userRatings.ratingDisplay,
            reliabilityPct: userRatings.reliabilityPct,
            isProvisional: userRatings.isProvisional,
          })
          .from(userRatings)
          .where(inArray(userRatings.userId, userIds))
      : [];
    const ratings = new Map(
      ratingsRows.map((r) => [
        r.userId,
        {
          ratingDisplay: r.ratingDisplay,
          reliabilityPct: r.reliabilityPct,
          isProvisional: r.isProvisional,
        },
      ]),
    );

    return {
      rows,
      ratings,
      viewer: { userId: viewerUserId, friendUserIds: friendIdSet },
      counts: {
        accepted: accepted.length,
        incoming: incoming.length,
        outgoing: outgoing.length,
        blocked: blocked.length,
      },
    };
  });
}

export default async function FriendsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const t = await getT();
  const data = await loadTab(tab, session.userId);

  const masked = maskUsersForViewer(
    data.rows.map((r) => r.other),
    data.viewer,
  );
  const maskedById = new Map(masked.map((u) => [u.id, u]));

  const tabLabels: Record<Tab, string> = {
    accepted: t('friends.tabAccepted'),
    incoming: t('friends.tabIncoming'),
    outgoing: t('friends.tabOutgoing'),
    blocked: t('friends.tabBlocked'),
  };

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">
            {t('friends.eyebrow')}
          </p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            {t('friends.title')}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            {t('friends.subtitle')}
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <AddFriendForm
            labels={{
              heading: t('friends.addHeading'),
              placeholder: t('friends.addPlaceholder'),
              cta: t('friends.addCta'),
              sendCta: t('friends.sendCta'),
              foundLabel: t('friends.foundLabel'),
              sentLabel: t('friends.sentLabel'),
            }}
          />

          <nav
            aria-label={t('friends.tabsAria')}
            className="mt-12 flex flex-wrap gap-6 border-b border-[var(--color-border)] text-xs uppercase tracking-[0.2em]"
          >
            {TABS.map((key) => {
              const active = key === tab;
              const count = data.counts[key];
              return (
                <Link
                  key={key}
                  href={`/play/friends?tab=${key}`}
                  className={
                    'feera-motion -mb-px border-b-2 pb-3 ' +
                    (active
                      ? 'border-court text-court'
                      : 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]')
                  }
                >
                  {tabLabels[key]} <span aria-hidden="true">({count})</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8">
            {data.rows.length === 0 ? (
              <p className="border border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-fg-muted)]">
                {tab === 'accepted'
                  ? t('friends.emptyAccepted')
                  : tab === 'incoming'
                    ? t('friends.emptyIncoming')
                    : tab === 'outgoing'
                      ? t('friends.emptyOutgoing')
                      : t('friends.emptyBlocked')}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
                {data.rows.map((row) => {
                  const u = maskedById.get(row.other.id) ?? row.other;
                  const rating = data.ratings.get(u.id);
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        {u.profilePhotoUrl ? (
                          // Next/Image requires remote allow-list; keep <img> for user-uploaded avatars.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.profilePhotoUrl}
                            alt=""
                            className="h-12 w-12 rounded-full border border-[var(--color-border)] object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] font-serif text-base text-[var(--color-fg-muted)]">
                            {(u.displayName ?? '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/play/players/${u.id}`}
                            className="font-serif text-lg hover:text-court"
                          >
                            {u.displayName}
                          </Link>
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
                            {u.city ? `${u.city} · ${u.countryCode}` : u.countryCode}
                          </p>
                          {rating ? (
                            <p className="mt-1 font-mono text-xs text-[var(--color-fg-muted)]">
                              {rating.ratingDisplay.toFixed(1)} · {rating.reliabilityPct}%
                              {rating.isProvisional ? ` · ${t('friends.provisional')}` : ''}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tab === 'accepted' ? (
                          <Link
                            href={`/play/players/${u.id}`}
                            className="inline-flex h-10 items-center justify-center border border-[var(--color-border)] px-4 text-xs uppercase tracking-[0.18em] hover:border-court hover:text-court"
                          >
                            {t('friends.viewProfile')}
                          </Link>
                        ) : null}

                        {tab === 'incoming' ? (
                          <>
                            <form action={acceptAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <button
                                type="submit"
                                className="inline-flex h-10 items-center justify-center border border-court bg-court px-4 text-xs uppercase tracking-[0.18em] text-cream hover:opacity-90"
                              >
                                {t('friends.accept')}
                              </button>
                            </form>
                            <form action={declineAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <button
                                type="submit"
                                className="inline-flex h-10 items-center justify-center border border-[var(--color-border)] px-4 text-xs uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500"
                              >
                                {t('friends.decline')}
                              </button>
                            </form>
                          </>
                        ) : null}

                        {tab === 'outgoing' ? (
                          <form action={cancelAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button
                              type="submit"
                              className="inline-flex h-10 items-center justify-center border border-[var(--color-border)] px-4 text-xs uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500"
                            >
                              {t('friends.cancel')}
                            </button>
                          </form>
                        ) : null}

                        {tab === 'blocked' ? (
                          <form action={unblockAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button
                              type="submit"
                              className="inline-flex h-10 items-center justify-center border border-[var(--color-border)] px-4 text-xs uppercase tracking-[0.18em] hover:border-court hover:text-court"
                            >
                              {t('friends.unblock')}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>
      </section>
    </>
  );
}
