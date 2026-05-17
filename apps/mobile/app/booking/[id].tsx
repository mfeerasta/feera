import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiBaseUrl } from '../../src/lib/api';
import { fmtRange } from '../../src/lib/format';

interface Participant {
  id: string;
  userId: string;
  displayName: string | null;
  status: string;
  seatsBooked?: number;
}

interface BookingDetail {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  totalAmount?: number;
  currency?: string;
  courtName?: string;
  clubName?: string;
  participants?: Participant[];
  seatsOpen?: number;
  maxParticipants?: number;
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery<{ data: BookingDetail }>(id ? `/api/v1/bookings/${id}` : null, [id]);

  if (q.loading && !q.data) return <Screen><ActivityIndicator color="#071C14" /></Screen>;
  if (q.error || !q.data?.data) {
    return <Screen><Text className="text-red-700 mt-12">Booking not found.</Text></Screen>;
  }
  const b = q.data.data;

  return (
    <Screen refreshing={q.loading} onRefresh={() => q.refetch()}>
      <View className="gap-2 mt-4">
        <Label>{b.clubName ?? 'Booking'} . {b.status}</Label>
        <Heading>{b.courtName ?? 'Court'}</Heading>
        <Text className="text-base text-ink-deep/70">{fmtRange(b.startAt, b.endAt)}</Text>
      </View>

      {b.totalAmount != null ? (
        <Card>
          <Label>Total</Label>
          <Text className="font-serif text-3xl text-ink-deep">
            {b.totalAmount} {b.currency ?? ''}
          </Text>
        </Card>
      ) : null}

      <View className="gap-3 mt-6">
        <Text className="font-serif text-2xl text-ink-deep">Players</Text>
        {(b.participants ?? []).length === 0 ? (
          <Text className="text-sm text-ink-deep/60">No confirmed players yet.</Text>
        ) : (
          (b.participants ?? []).map((p) => (
            <Card key={p.id}>
              <Text className="text-base text-ink-deep">{p.displayName ?? p.userId.slice(0, 8)}</Text>
              <Label>{p.status}{p.seatsBooked ? ` . ${p.seatsBooked} seat${p.seatsBooked === 1 ? '' : 's'}` : ''}</Label>
            </Card>
          ))
        )}
        {b.seatsOpen != null && b.seatsOpen > 0 ? (
          <Text className="text-sm text-court">{b.seatsOpen} seats open</Text>
        ) : null}
      </View>

      <View className="gap-3 mt-8">
        <Button onPress={() => Linking.openURL(`${apiBaseUrl()}/play/bookings/${b.id}/pay`)}>
          Pay your share
        </Button>
        <Text className="text-[10px] uppercase tracking-[2px] text-ink-deep/50 text-center">
          Native pay sheet lands in M7
        </Text>
      </View>
    </Screen>
  );
}
