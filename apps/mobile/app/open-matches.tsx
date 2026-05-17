import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Screen } from '../src/components/screen';
import { Card } from '../src/components/card';
import { Label, Heading } from '../src/components/label';
import { Button } from '../src/components/button';
import { Input } from '../src/components/input';
import { useQuery } from '../src/lib/hooks/use-query';
import { apiFetch, ApiError } from '../src/lib/api';
import { fmtRange } from '../src/lib/format';

interface OpenBooking {
  id: string;
  courtName?: string;
  clubName?: string;
  city?: string;
  startAt: string;
  endAt: string;
  seatsOpen: number;
  organizerName?: string;
  requiredLevelMin?: number | null;
  requiredLevelMax?: number | null;
  genderPreference: 'open' | 'men_only' | 'women_only' | 'mixed';
}

export default function OpenMatchesScreen() {
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'' | 'open' | 'men_only' | 'women_only' | 'mixed'>('');

  const path = useMemo(() => {
    const qs = new URLSearchParams({ limit: '60' });
    qs.set('from', new Date().toISOString());
    if (city) qs.set('city', city);
    if (gender) qs.set('gender', gender);
    return `/api/v1/bookings/open?${qs.toString()}`;
  }, [city, gender]);

  const q = useQuery<{ data: OpenBooking[] }>(path, [path]);
  const [joinFor, setJoinFor] = useState<OpenBooking | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <Screen refreshing={q.loading} onRefresh={() => q.refetch()}>
      <View className="gap-2 mt-4">
        <Label>Open matches</Label>
        <Heading>Find a game tonight</Heading>
        <Text className="text-sm text-ink-deep/70">
          Bookings with seats open in your city.
        </Text>
      </View>

      <View className="mt-4 gap-2">
        <Input placeholder="City" value={city} onChangeText={setCity} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {(['', 'open', 'mixed', 'men_only', 'women_only'] as const).map((g) => (
            <Pressable
              key={g || 'any'}
              onPress={() => setGender(g)}
              className={`border px-4 py-2 ${gender === g ? 'border-court bg-court' : 'border-ink-deep/20 bg-paper'}`}
            >
              <Text className={`text-xs uppercase tracking-[1px] ${gender === g ? 'text-cream' : 'text-ink-deep/70'}`}>
                {g ? g.replace(/_/g, ' ') : 'Any gender'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="gap-3 mt-6">
        {q.loading && !q.data ? <ActivityIndicator color="#071C14" /> : null}
        {q.error ? (
          <Text className="text-red-700 text-sm">{q.error.message}</Text>
        ) : null}
        {(q.data?.data ?? []).length === 0 && !q.loading ? (
          <Text className="text-sm text-ink-deep/60 text-center mt-8">
            Nothing open right now.
          </Text>
        ) : null}
        {q.data?.data?.map((b) => (
          <Card key={b.id}>
            <View className="flex-row justify-between">
              <Label>{b.city ?? ''}{b.clubName ? ` . ${b.clubName}` : ''}</Label>
              <Text className="text-[10px] uppercase tracking-[2px] text-brass">{b.seatsOpen} open</Text>
            </View>
            <Text className="font-serif text-xl text-ink-deep">{b.courtName ?? 'Court'}</Text>
            <Text className="text-sm text-ink-deep/70">{fmtRange(b.startAt, b.endAt)}</Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {b.organizerName ? <Tag>Host {b.organizerName}</Tag> : null}
              {(b.requiredLevelMin || b.requiredLevelMax) ? (
                <Tag>Level {b.requiredLevelMin ?? 0}-{b.requiredLevelMax ?? 7}</Tag>
              ) : null}
              {b.genderPreference !== 'open' ? <Tag>{b.genderPreference.replace(/_/g, ' ')}</Tag> : null}
            </View>
            <View className="mt-3">
              <Button variant="outline" onPress={() => setJoinFor(b)}>Request to join</Button>
            </View>
          </Card>
        ))}
      </View>

      <JoinModal
        booking={joinFor}
        onClose={() => setJoinFor(null)}
        onJoined={() => {
          setJoinFor(null);
          setToast('Request sent. The host will respond shortly.');
          setTimeout(() => setToast(null), 4000);
          void q.refetch();
        }}
      />

      {toast ? (
        <View className="absolute bottom-12 left-6 right-6 bg-ink-deep p-4 border border-court">
          <Text className="text-cream text-sm">{toast}</Text>
        </View>
      ) : null}
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

interface JoinModalProps {
  booking: OpenBooking | null;
  onClose: () => void;
  onJoined: () => void;
}

function JoinModal({ booking, onClose, onJoined }: JoinModalProps) {
  const [message, setMessage] = useState('');
  const [seats, setSeats] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/bookings/${booking.id}/join`, {
        method: 'POST',
        body: JSON.stringify({
          seatsRequested: Math.max(1, Math.min(4, Number(seats) || 1)),
          message: message || undefined,
        }),
      });
      onJoined();
      setMessage('');
      setSeats('1');
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${typeof e.body === 'string' ? e.body : 'Join failed'}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={booking !== null} animationType="slide" transparent>
      <View className="flex-1 bg-ink-deep/60 justify-end">
        <View className="bg-cream p-6 gap-3">
          <Label>Request to join</Label>
          <Heading>{booking?.courtName ?? 'Match'}</Heading>
          <Label>Seats</Label>
          <Input value={seats} onChangeText={setSeats} keyboardType="number-pad" />
          <Label>Message (optional)</Label>
          <Input value={message} onChangeText={setMessage} multiline placeholder="Hi! I'm a 3.5 player..." />
          {error ? <Text className="text-red-700 text-sm">{error}</Text> : null}
          <View className="flex-row gap-3 mt-2">
            <View className="flex-1"><Button variant="outline" onPress={onClose}>Cancel</Button></View>
            <View className="flex-1"><Button onPress={submit} loading={busy}>Send</Button></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
