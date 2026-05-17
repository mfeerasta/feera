import Link from 'next/link';
import { notFound } from 'next/navigation';
import { playFetch } from '@/lib/play/api-client';
import { BookCoachingForm } from './book-coaching-form';

interface CoachDetail {
  userId: string;
  coachId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  certifications: Array<{ title?: string; issuer?: string; year?: number }>;
  yearsExperience: number | null;
  hourlyRate: number;
  hourlyRateMax: number | null;
  currency: string;
  introVideoUrl: string | null;
  responseTimeAvgHours: number;
  isVerifiedByFeera: boolean;
  isEditionEndorsed: boolean;
  isAcceptingBookings: boolean;
  averageRating: number | null;
  ratingCount: number;
  reliabilityPct: number | null;
}

interface AvailabilityResponse {
  data: Array<{ startAt: string; endAt: string }>;
  windowDays: number;
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Parse a youtube / vimeo URL into an embed src. Returns null if the URL is
 * unsupported. We deliberately whitelist the two providers our T&Cs allow.
 */
function videoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }
    if (u.hostname.endsWith('vimeo.com')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default async function CoachDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const res = await playFetch(`/api/v1/coaches/${encodeURIComponent(userId)}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <section className="mx-auto max-w-[1280px] px-6 py-20">
        <p className="text-sm text-red-600">
          Failed to load coach (HTTP {res.status}).
        </p>
      </section>
    );
  }
  const { data: coach } = (await res.json()) as { data: CoachDetail };

  const availRes = await playFetch(
    `/api/v1/coaches/${encodeURIComponent(userId)}/availability?days=14`,
  );
  let slots: Array<{ startAt: string; endAt: string }> = [];
  if (availRes.ok) {
    const j = (await availRes.json()) as AvailabilityResponse;
    slots = j.data;
  }

  const embed = coach.introVideoUrl ? videoEmbedSrc(coach.introVideoUrl) : null;

  const pendingNotice = !coach.isVerifiedByFeera;

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <Link
            href="/play/coaches"
            className="text-xs uppercase tracking-[0.25em] text-cream/60 transition-colors duration-150 hover:text-court"
          >
            All coaches
          </Link>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cream/60">
                {coach.countryCode}
                {coach.city ? ` · ${coach.city}` : ''}
                {coach.isEditionEndorsed ? ' · Edition endorsed' : ''}
              </p>
              <h1 className="mt-3 font-serif text-5xl tracking-tight text-cream">
                {coach.displayName}
              </h1>
              <p className="mt-3 text-sm text-cream/70">
                {coach.averageRating != null
                  ? `${coach.averageRating.toFixed(1)} stars across ${coach.ratingCount} review${coach.ratingCount === 1 ? '' : 's'}`
                  : 'New coach, no reviews yet'}
                {coach.reliabilityPct != null && coach.reliabilityPct > 0
                  ? ` · ${coach.reliabilityPct}% on time`
                  : ''}
                {' · Replies in ' + coach.responseTimeAvgHours + 'h'}
              </p>
            </div>
            <div className="md:text-end">
              <p className="font-serif text-3xl text-cream">
                {coach.currency} {Math.round(coach.hourlyRate)}
                {coach.hourlyRateMax && coach.hourlyRateMax > coach.hourlyRate
                  ? ` to ${Math.round(coach.hourlyRateMax)}`
                  : ''}{' '}
                / hour
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cream/60">
                Pay at booking
              </p>
            </div>
          </div>
        </div>
      </section>

      {pendingNotice && (
        <section className="bg-brass/15">
          <div className="mx-auto max-w-[1280px] px-6 py-4 text-sm text-ink-deep">
            Pending verification. This profile is visible only to the coach and
            Feera admins until verification is approved.
          </div>
        </section>
      )}

      <section className="bg-cream">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-10">
            {coach.bio && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                  About
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-deep/80">
                  {coach.bio}
                </p>
              </div>
            )}

            {embed && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                  Intro video
                </p>
                <div className="mt-3 aspect-video w-full border border-ink-deep/15 bg-ink-deep">
                  <iframe
                    title={`Intro video from ${coach.displayName}`}
                    src={embed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {coach.specialties.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                  Specialties
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {coach.specialties.map((s) => (
                    <li
                      key={s}
                      className="border border-ink-deep/20 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-ink-deep/70"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coach.certifications.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                  Certifications
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-deep/80">
                  {coach.certifications.map((c, i) => (
                    <li key={i} className="border-b border-ink-deep/10 pb-2">
                      <span className="font-medium">{c.title ?? 'Certification'}</span>
                      {c.issuer && (
                        <span className="text-ink-deep/60"> · {c.issuer}</span>
                      )}
                      {c.year && <span className="text-ink-deep/60"> · {c.year}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coach.languages.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
                  Languages
                </p>
                <p className="mt-3 text-sm text-ink-deep/80">
                  {coach.languages.join(', ')}
                </p>
              </div>
            )}
          </div>

          <aside className="border border-ink-deep/15 bg-paper p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-deep/50">
              Next 14 days
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink-deep">
              Pick a slot.
            </h2>
            {coach.isAcceptingBookings ? (
              <BookCoachingForm
                coachUserId={coach.userId}
                currency={coach.currency}
                hourlyRate={coach.hourlyRate}
                slots={slots}
              />
            ) : (
              <p className="mt-6 text-sm text-ink-deep/70">
                This coach is not accepting new bookings right now. Check back soon or message them via chat.
              </p>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
