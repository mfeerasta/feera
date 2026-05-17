import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { Input } from '../../src/components/input';
import { apiFetch, ApiError } from '../../src/lib/api';
import { useQuery } from '../../src/lib/hooks/use-query';
import { daysFromToday, fmtDate } from '../../src/lib/format';

interface Court {
  id: string;
  name: string;
  surface: string;
  isIndoor: boolean;
  clubName?: string;
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export default function CourtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const court = useQuery<{ data: Court }>(id ? `/api/v1/courts/${id}` : null, [id]);

  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; hour: number } | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => daysFromToday(i)), []);

  if (court.loading && !court.data) {
    return <Screen variant="cream"><ActivityIndicator color="#071C14" /></Screen>;
  }
  if (court.error || !court.data?.data) {
    return (
      <Screen variant="cream">
        <Text className="text-red-700 mt-12">Court not found.</Text>
      </Screen>
    );
  }
  const c = court.data.data;

  return (
    <Screen variant="cream">
      <View className="gap-2 mt-4">
        <Label>{c.clubName ?? 'Court'}</Label>
        <Heading>{c.name}</Heading>
        <Text className="text-sm text-ink-deep/70">
          {c.surface.replace(/_/g, ' ')} . {c.isIndoor ? 'Indoor' : 'Outdoor'}
        </Text>
      </View>

      <Text className="font-serif text-2xl text-ink-deep mt-8">Pick a slot</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        {days.map((d) => (
          <View key={d.toISOString()} className="me-2 border border-ink-deep/15 bg-paper">
            <View className="border-b border-ink-deep/10 px-3 py-2">
              <Text className="text-[10px] uppercase tracking-[2px] text-ink-deep/60">
                {fmtDate(d.toISOString())}
              </Text>
            </View>
            <View>
              {HOURS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setSelectedSlot({ day: d, hour: h })}
                  className="px-3 py-2 border-b border-ink-deep/5 active:bg-court/10"
                >
                  <Text className="text-sm text-ink-deep">
                    {h.toString().padStart(2, '0')}:00
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <BookingModal
        visible={selectedSlot !== null}
        slot={selectedSlot}
        courtId={c.id}
        onClose={() => setSelectedSlot(null)}
        onCreated={(bookingId) => {
          setSelectedSlot(null);
          router.replace(`/booking/${bookingId}`);
        }}
      />
    </Screen>
  );
}

interface BookingModalProps {
  visible: boolean;
  slot: { day: Date; hour: number } | null;
  courtId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function BookingModal({ visible, slot, courtId, onClose, onCreated }: BookingModalProps) {
  const [duration, setDuration] = useState('90');
  const [seats, setSeats] = useState('1');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [gender, setGender] = useState<'open' | 'men_only' | 'women_only' | 'mixed'>('open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      const startAt = new Date(slot.day);
      startAt.setHours(slot.hour, 0, 0, 0);
      const body = {
        courtId,
        startAt: startAt.toISOString(),
        durationMinutes: Number(duration) || 90,
        seatsBooked: Math.max(1, Math.min(4, Number(seats) || 1)),
        isOpenMatch: Number(seats) < 4,
        maxParticipants: 4,
        genderPreference: gender,
        requiredLevelMin: levelMin ? Number(levelMin) : undefined,
        requiredLevelMax: levelMax ? Number(levelMax) : undefined,
      };
      const json = await apiFetch<{ data: { id: string } }>('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onCreated(json.data.id);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${typeof e.body === 'string' ? e.body : 'Booking failed'}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-ink-deep/60 justify-end">
        <View className="bg-cream p-6 gap-3">
          <Label>New booking</Label>
          <Heading>
            {slot ? `${fmtDate(slot.day.toISOString())} at ${slot.hour.toString().padStart(2, '0')}:00` : ''}
          </Heading>

          <Label>Duration (minutes)</Label>
          <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />

          <Label>Your seats (1-4)</Label>
          <Input value={seats} onChangeText={setSeats} keyboardType="number-pad" />

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Level min</Label>
              <Input value={levelMin} onChangeText={setLevelMin} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View className="flex-1 gap-2">
              <Label>Level max</Label>
              <Input value={levelMax} onChangeText={setLevelMax} keyboardType="decimal-pad" placeholder="7" />
            </View>
          </View>

          <Label>Gender preference</Label>
          <View className="flex-row flex-wrap gap-2">
            {(['open', 'mixed', 'men_only', 'women_only'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                className={`border px-3 py-2 ${gender === g ? 'border-court bg-court' : 'border-ink-deep/20 bg-paper'}`}
              >
                <Text className={`text-xs uppercase tracking-[1px] ${gender === g ? 'text-cream' : 'text-ink-deep/70'}`}>
                  {g.replace(/_/g, ' ')}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <Text className="text-red-700 text-sm">{error}</Text>
          ) : null}

          <View className="flex-row gap-3 mt-3">
            <View className="flex-1">
              <Button variant="outline" onPress={onClose}>Cancel</Button>
            </View>
            <View className="flex-1">
              <Button variant="primary" onPress={submit} loading={busy}>Book</Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
