import { and, eq, isNull } from 'drizzle-orm';
import { clubs, courts } from '@feera/db';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ClubSubNav } from '../sub-nav';
import { PhotoUploader } from './photo-uploader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

interface CourtRow {
  id: string;
  name: string;
  photos: string[];
}

export default async function ClubPhotosPage({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const { slug } = await params;
  const t = await getT();
  const session = await getSession();

  const data = await withRequestContext(session, async (tx) => {
    const [club] = await tx
      .select({
        id: clubs.id,
        name: clubs.name,
        photos: clubs.photos,
      })
      .from(clubs)
      .where(and(eq(clubs.slug, slug), isNull(clubs.deletedAt)))
      .limit(1);
    if (!club) return null;

    const cts = await tx
      .select({
        id: courts.id,
        name: courts.name,
        photos: courts.photos,
      })
      .from(courts)
      .where(eq(courts.clubId, club.id));

    return {
      club,
      courts: cts.map((c) => ({
        ...c,
        photos: (c.photos ?? []) as string[],
      })),
    };
  });

  if (!data) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        Club not found.
      </p>
    );
  }

  const clubPhotos = (data.club.photos ?? []) as string[];

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="mt-4 font-serif text-4xl tracking-tight">{data.club.name}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        Manage club and court photos
      </p>

      <ClubSubNav slug={slug} active="/photos" t={t} />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Club Photos</CardTitle>
        </CardHeader>
        <CardBody>
          {clubPhotos.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              No club photos uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {clubPhotos.map((url, i) => (
                <div
                  key={url}
                  className="group relative border border-[color:var(--color-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Club photo ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <PhotoUploader slug={slug} kind="club-logo" />
          </div>
        </CardBody>
      </Card>

      {data.courts.map((court: CourtRow) => (
        <Card key={court.id} className="mb-6">
          <CardHeader>
            <CardTitle>{court.name}</CardTitle>
          </CardHeader>
          <CardBody>
            {court.photos.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                No photos for this court.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {court.photos.map((url: string, i: number) => (
                  <div
                    key={url}
                    className="group relative border border-[color:var(--color-border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${court.name} photo ${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <PhotoUploader slug={slug} kind="court-photo" courtId={court.id} />
            </div>
          </CardBody>
        </Card>
      ))}
    </section>
  );
}
