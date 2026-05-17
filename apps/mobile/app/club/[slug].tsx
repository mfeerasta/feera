import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { useQuery } from '../../src/lib/hooks/use-query';

interface CourtRow {
  id: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  isClimateControlled: boolean;
  isPanoramic: boolean;
  isActive: boolean;
}

interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  city: string;
  address: string | null;
  hasIndoor?: boolean;
  hasOutdoor?: boolean;
  hasClimateControl?: boolean;
  hasWomenOnlyHours?: boolean;
}

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const club = useQuery<{ data: ClubDetail }>(slug ? `/api/v1/clubs/${slug}` : null, [slug]);
  const courts = useQuery<{ data: CourtRow[] }>(slug ? `/api/v1/clubs/${slug}/courts` : null, [slug]);

  if (club.loading && !club.data) {
    return (
      <Screen variant="cream"><ActivityIndicator color="#071C14" /></Screen>
    );
  }
  if (club.error || !club.data?.data) {
    return (
      <Screen variant="cream">
        <Text className="text-red-700 mt-12">Club not found.</Text>
      </Screen>
    );
  }
  const c = club.data.data;
  const activeCourts = (courts.data?.data ?? []).filter((x) => x.isActive);

  return (
    <Screen variant="cream" refreshing={courts.loading} onRefresh={() => { void club.refetch(); void courts.refetch(); }}>
      <View className="gap-2 mt-4">
        <Label>{c.countryCode} . {c.city}</Label>
        <Heading>{c.name}</Heading>
        {c.address ? <Text className="text-sm text-ink-deep/70">{c.address}</Text> : null}
        <View className="flex-row flex-wrap gap-2 mt-2">
          {c.hasIndoor ? <Tag>Indoor</Tag> : null}
          {c.hasOutdoor ? <Tag>Outdoor</Tag> : null}
          {c.hasClimateControl ? <Tag>Climate</Tag> : null}
          {c.hasWomenOnlyHours ? <Tag>Women hrs</Tag> : null}
        </View>
      </View>

      <View className="gap-3 mt-8">
        <Text className="font-serif text-2xl text-ink-deep">Courts</Text>
        {activeCourts.length === 0 ? (
          <Text className="text-sm text-ink-deep/60">No active courts at this club.</Text>
        ) : (
          activeCourts.map((court) => (
            <Card key={court.id} onPress={() => router.push(`/court/${court.id}`)}>
              <Text className="font-serif text-xl text-ink-deep">{court.name}</Text>
              <Label>
                {court.surface.replace(/_/g, ' ')} . {court.isIndoor ? 'Indoor' : 'Outdoor'}
                {court.isPanoramic ? ' . panoramic' : ''}
              </Label>
              <Text className="text-court text-xs uppercase tracking-[2px] mt-2">Book a slot</Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <Text className="border border-ink-deep/15 px-2 py-1 text-[10px] uppercase tracking-[1px] text-ink-deep/60">
      {children}
    </Text>
  );
}
