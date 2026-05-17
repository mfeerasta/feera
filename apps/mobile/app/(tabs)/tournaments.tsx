import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { useQuery } from '../../src/lib/hooks/use-query';
import { fmtDate } from '../../src/lib/format';

interface Tournament {
  id: string;
  name: string;
  format: string;
  city: string | null;
  countryCode: string;
  startAt: string;
  endAt: string;
  status: string;
  entryFee: number;
  currency: string;
}

const FORMATS = ['', 'americano', 'mexicano', 'round_robin', 'single_elimination', 'king_of_the_court'];

export default function TournamentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [format, setFormat] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const path = useMemo(() => {
    const qs = new URLSearchParams({ status: 'open' });
    if (format) qs.set('format', format);
    if (city) qs.set('city', city);
    return `/api/v1/tournaments?${qs.toString()}`;
  }, [format, city]);

  const q = useQuery<{ data: Tournament[] }>(path, [path]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    q.data?.data?.forEach((t) => t.city && s.add(t.city));
    return Array.from(s).sort();
  }, [q.data]);

  return (
    <Screen variant="cream" refreshing={q.loading} onRefresh={() => q.refetch()}>
      <View className="gap-2 mt-4">
        <Label>{t('tournaments.title')}</Label>
        <Heading>Open draws</Heading>
        <Text className="text-base text-ink-deep/70">{t('tournaments.subtitle')}</Text>
      </View>

      <View className="mt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {FORMATS.map((f) => (
            <Chip key={f || 'all'} active={format === f} onPress={() => setFormat(f)}>
              {f ? f.replace(/_/g, ' ') : 'All formats'}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {cities.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mt-2">
          <Chip active={city === ''} onPress={() => setCity('')}>All cities</Chip>
          {cities.map((c) => (
            <Chip key={c} active={city === c} onPress={() => setCity(c)}>{c}</Chip>
          ))}
        </ScrollView>
      ) : null}

      <View className="gap-3 mt-6">
        {q.loading && !q.data ? <ActivityIndicator color="#071C14" /> : null}
        {q.error ? (
          <View className="border border-red-500/40 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{q.error.message}</Text>
          </View>
        ) : null}
        {!q.loading && (q.data?.data?.length ?? 0) === 0 ? (
          <Text className="text-sm text-ink-deep/60 text-center mt-8">
            No open tournaments. Check back soon.
          </Text>
        ) : null}
        {q.data?.data?.map((tn) => (
          <Card key={tn.id} onPress={() => router.push(`/tournament/${tn.id}`)}>
            <Label>{tn.format.replace(/_/g, ' ')} . {tn.countryCode}</Label>
            <Text className="font-serif text-2xl text-ink-deep">{tn.name}</Text>
            <Text className="text-sm text-ink-deep/70">
              {tn.city ?? 'Online'} . {fmtDate(tn.startAt)}
            </Text>
            <Text className="text-sm text-court mt-1">
              {tn.entryFee > 0 ? `${tn.entryFee} ${tn.currency}` : 'Free entry'}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function Chip({ children, active, onPress }: { children: React.ReactNode; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`border px-4 py-2 ${active ? 'border-court bg-court' : 'border-ink-deep/20 bg-paper'}`}
    >
      <Text className={`text-xs uppercase tracking-[2px] ${active ? 'text-cream' : 'text-ink-deep/70'}`}>
        {children}
      </Text>
    </Pressable>
  );
}
