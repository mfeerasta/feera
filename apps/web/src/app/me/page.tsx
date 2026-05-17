import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { userRatings, users } from '@feera/db';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { MeForm } from './me-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProfileData {
  user: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    locale: 'en' | 'ur' | 'ar' | 'es' | 'fr' | 'it' | 'pt';
    countryCode: string;
    city: string | null;
    gender: string | null;
    genderVisibility: 'public' | 'friends' | 'private';
    womenOnlyPoolOptIn: boolean;
    profilePhotoUrl: string | null;
    bio: string | null;
    editionMemberStatus: 'none' | 'applicant' | 'active' | 'lapsed' | 'suspended';
    isVerifiedCoach: boolean;
  };
  rating: {
    ratingDisplay: number;
    reliabilityPct: number;
    matchCount: number;
    isProvisional: boolean;
  } | null;
}

async function loadProfile(userId: string): Promise<ProfileData | null> {
  const session = await getSession();
  return withRequestContext(session, async (tx) => {
    const [user] = await tx
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        locale: users.locale,
        countryCode: users.countryCode,
        city: users.city,
        gender: users.gender,
        genderVisibility: users.genderVisibility,
        womenOnlyPoolOptIn: users.womenOnlyPoolOptIn,
        profilePhotoUrl: users.profilePhotoUrl,
        bio: users.bio,
        editionMemberStatus: users.editionMemberStatus,
        isVerifiedCoach: users.isVerifiedCoach,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) return null;

    const [rating] = await tx
      .select({
        ratingDisplay: userRatings.ratingDisplay,
        reliabilityPct: userRatings.reliabilityPct,
        matchCount: userRatings.matchCount,
        isProvisional: userRatings.isProvisional,
      })
      .from(userRatings)
      .where(eq(userRatings.userId, userId))
      .limit(1);

    return { user, rating: rating ?? null } as ProfileData;
  });
}

export default async function MePage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in?next=/me');
  }
  const data = await loadProfile(session.userId);
  if (!data) {
    redirect('/sign-in?next=/me');
  }

  const { user, rating } = data;
  const t = await getT();
  const genderLabel =
    user.gender === 'm'
      ? t('onboarding.genderMale')
      : user.gender === 'f'
        ? t('onboarding.genderFemale')
        : user.gender === 'x'
          ? t('onboarding.genderOther')
          : t('common.none');
  const visibilityLabel =
    user.genderVisibility === 'public'
      ? t('privacyControls.allowMessagesAll')
      : user.genderVisibility === 'friends'
        ? t('privacyControls.allowMessagesFriends')
        : t('privacyControls.allowMessagesNone');

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header
        data-theme="dark"
        className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="feera-motion font-serif text-2xl tracking-tight">
            feera
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/play/clubs"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              {t('nav.clubs')}
            </Link>
            <Link
              href="/play/open"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              {t('nav.openMatches')}
            </Link>
            <Link
              href="/play/bookings"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              {t('nav.myBookings')}
            </Link>
            <Link
              href="/me"
              className="feera-motion text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
            >
              {t('nav.profile')}
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          {t('me.title')}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">{user.displayName}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          {user.email ?? user.phone ?? '—'}
          {' '}
          ·
          {' '}
          {user.city ? `${user.city}, ${user.countryCode}` : user.countryCode}
          {user.editionMemberStatus === 'active' ? ` · ${t('me.editionMember')}` : ''}
          {user.isVerifiedCoach ? ` · ${t('nav.coaches')}` : ''}
        </p>

        <div className="mt-10 grid grid-cols-3 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)]">
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {t('me.rating')}
            </p>
            <p className="mt-2 font-serif text-3xl tracking-tight">
              {rating ? rating.ratingDisplay.toFixed(2) : '-.--'}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              {rating?.isProvisional ? t('status.pending') : t('status.confirmed')}
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {t('me.reliabilityCard')}
            </p>
            <p className="mt-2 font-serif text-3xl tracking-tight">
              {rating ? `${rating.reliabilityPct}%` : '-'}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              {t('me.matchesPlayed')}: {rating?.matchCount ?? 0}
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {t('section.privacy')}
            </p>
            <p className="mt-2 font-serif text-2xl tracking-tight">
              {visibilityLabel}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              {t('privacyControls.showFullName')}
            </p>
          </div>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>{t('me.section.privacy')}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {t('onboarding.genderLabel')}
                  </p>
                  <p className="mt-2 text-[color:var(--color-fg)]">{genderLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {t('me.section.privacy')}
                  </p>
                  <p className="mt-2 text-[color:var(--color-fg)]">{visibilityLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {t('privacyControls.womenOnlyTitle')}
                  </p>
                  <p className="mt-2 text-[color:var(--color-fg)]">
                    {user.gender === 'f'
                      ? user.womenOnlyPoolOptIn
                        ? t('status.active')
                        : t('common.no')
                      : t('common.none')}
                  </p>
                </div>
              </div>
              <Link
                href="/me/privacy"
                className="mt-6 inline-flex items-center text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)] hover:underline"
              >
                {t('common.edit')}
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>{t('nav.profile')}</CardTitle>
            </CardHeader>
            <CardBody>
              <MeForm
                initial={{
                  displayName: user.displayName,
                  locale: user.locale,
                  city: user.city ?? '',
                  genderVisibility: user.genderVisibility,
                  bio: user.bio ?? '',
                  profilePhotoUrl: user.profilePhotoUrl,
                }}
              />
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
