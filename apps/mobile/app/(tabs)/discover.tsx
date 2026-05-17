import { useState, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { useQuery } from '../../src/lib/hooks/use-query';

interface Club {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  hasIndoor?: boolean;
  hasOutdoor?: boolean;
  hasClimateControl?: boolean;
}

interface MeResponse {
  data?: { user?: { countryCode?: string } };
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const me = useQuery<MeResponse>('/api/v1/me');
  const countryCode = me.data?.data?.user?.countryCode ?? 'PK';

  const clubs = useQuery<{ data: Club[] }>(
    `/api/v1/clubs?country_code=${countryCode}&limit=60`,
    [countryCode],
  );

  const cities = useMemo(() => {
    const set = new Set<string>();
    clubs.data?.data?.forEach((c) => c.city && set.add(c.city));
    return Array.from(set).sort();
  }, [clubs.data]);

  const [city, setCity] = useState<string | null>(null);
  const filtered = useMemo(
    () => (city ? clubs.data?.data?.filter((c) => c.city === city) ?? [] : clubs.data?.data ?? []),
    [city, clubs.data],
  );

  return (
    <Screen
      variant="cream"
      refreshing={clubs.loading}
      onRefresh={() => clubs.refetch()}
    >
      <View className="gap-2 mt-4">
        <Label>{t('discover.title')}</Label>
        <Heading>Clubs in {countryCode}</Heading>
        <Text className="text-base text-ink-deep/70">{t('discover.subtitle')}</Text>
      </View>

      {cities.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mt-4">
          <Chip active={city === null} onPress={() => setCity(null)}>All</Chip>
          {cities.map((c) => (
            <Chip key={c} active={city === c} onPress={() => setCity(c)}>{c}</Chip>
          ))}
        </ScrollView>
      ) : null}

      <View className="gap-3 mt-6">
        {clubs.loading && !clubs.data ? <ActivityIndicator color="#071C14" /> : null}
        {clubs.error ? (
          <View className="border border-red-500/40 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{clubs.error.message}</Text>
          </View>
        ) : null}
        {!clubs.loading && filtered.length === 0 ? (
          <Text className="text-sm text-ink-deep/60 text-center mt-8">
            No clubs match. Try a different city.
          </Text>
        ) : null}
        {filtered.map((c) => (
          <Card key={c.id} onPress={() => router.push(`/club/${c.slug}`)}>
            <Label>{c.countryCode} . {c.city}</Label>
            <Text className="font-serif text-2xl text-ink-deep">{c.name}</Text>
            <View className="flex-row gap-2 mt-1">
              {c.hasIndoor ? <Tag>Indoor</Tag> : null}
              {c.hasOutdoor ? <Tag>Outdoor</Tag> : null}
              {c.hasClimateControl ? <Tag>Climate</Tag> : null}
            </View>
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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <Text className="border border-ink-deep/15 px-2 py-1 text-[10px] uppercase tracking-[1px] text-ink-deep/60">
      {children}
    </Text>
  );
}
