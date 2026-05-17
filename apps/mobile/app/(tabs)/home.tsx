import { useCallback, useMemo } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { useQuery } from '../../src/lib/hooks/use-query';
import { fmtRange } from '../../src/lib/format';
import { authClient } from '../../src/auth/client';

interface BookingRow {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  courtName?: string;
  clubName?: string;
  city?: string;
  seatsOpen?: number;
  maxParticipants?: number;
}

interface ApiList<T> { data: T[] }

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const now = useMemo(() => new Date().toISOString(), []);

  const upcoming = useQuery<ApiList<BookingRow>>(
    userId ? `/api/v1/bookings?organizerUserId=${userId}&from=${encodeURIComponent(now)}&limit=10` : null,
    [userId, now],
  );
  const openMatches = useQuery<ApiList<BookingRow>>(
    `/api/v1/bookings/open?from=${encodeURIComponent(now)}&limit=10`,
    [now],
  );

  const refreshing = upcoming.loading || openMatches.loading;
  const onRefresh = useCallback(() => {
    void upcoming.refetch();
    void openMatches.refetch();
  }, [upcoming, openMatches]);

  return (
    <Screen variant="cream" refreshing={refreshing} onRefresh={onRefresh}>
      <View className="gap-2 mt-4">
        <Label>{t('brand.wordmark')}</Label>
        <Heading>{t('home.hello')}</Heading>
        <Text className="text-base text-ink-deep/70">{t('home.subtitle')}</Text>
      </View>

      <Section title="Your upcoming bookings">
        {upcoming.loading && !upcoming.data ? <ActivityIndicator color="#071C14" /> : null}
        {upcoming.error ? <ErrorBox text={upcoming.error.message} /> : null}
        {upcoming.data?.data?.length === 0 ? (
          <Empty text="No bookings yet. Browse clubs to book a court." />
        ) : (
          upcoming.data?.data?.map((b) => (
            <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <Label>{b.clubName ?? b.city ?? 'Booking'}</Label>
              <Text className="font-serif text-xl text-ink-deep">{b.courtName ?? 'Court'}</Text>
              <Text className="text-sm text-ink-deep/70">{fmtRange(b.startAt, b.endAt)}</Text>
              <Text className="text-[10px] uppercase tracking-[2px] text-court mt-1">{b.status}</Text>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="Open matches near you"
        right={
          <Link href="/open-matches" className="text-court text-xs uppercase tracking-[2px]">
            See all
          </Link>
        }
      >
        {openMatches.loading && !openMatches.data ? <ActivityIndicator color="#071C14" /> : null}
        {openMatches.error ? <ErrorBox text={openMatches.error.message} /> : null}
        {openMatches.data?.data?.length === 0 ? (
          <Empty text="No open matches in the next few days. Start one of your own." />
        ) : (
          openMatches.data?.data?.slice(0, 5).map((b) => (
            <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <View className="flex-row justify-between">
                <Label>{b.city ?? ''}{b.clubName ? ` . ${b.clubName}` : ''}</Label>
                {b.seatsOpen != null ? (
                  <Text className="text-[10px] uppercase tracking-[2px] text-brass">
                    {b.seatsOpen} open
                  </Text>
                ) : null}
              </View>
              <Text className="font-serif text-xl text-ink-deep">{b.courtName ?? 'Court'}</Text>
              <Text className="text-sm text-ink-deep/70">{fmtRange(b.startAt, b.endAt)}</Text>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3 mt-8">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-serif text-2xl text-ink-deep">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View className="border border-dashed border-ink-deep/20 p-6 items-center">
      <Text className="text-sm text-ink-deep/60 text-center">{text}</Text>
    </View>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View className="border border-red-500/40 bg-red-50 p-3">
      <Text className="text-sm text-red-700">{text}</Text>
    </View>
  );
}
