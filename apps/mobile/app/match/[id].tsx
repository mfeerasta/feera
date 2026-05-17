import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { Input } from '../../src/components/input';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiFetch, ApiError } from '../../src/lib/api';
import { authClient } from '../../src/auth/client';

interface MatchPlayer {
  userId: string;
  displayName: string | null;
}

interface MatchDetail {
  id: string;
  status: string;
  playedAt: string;
  teamA: MatchPlayer[];
  teamB: MatchPlayer[];
  sets?: Array<[number, number]>;
  verificationStatus?: string;
  bookingId?: string;
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const q = useQuery<{ data: MatchDetail }>(id ? `/api/v1/matches/${id}` : null, [id]);
  const m = q.data?.data;

  const isPlayer = useMemo(() => {
    if (!m || !userId) return false;
    return [...m.teamA, ...m.teamB].some((p) => p.userId === userId);
  }, [m, userId]);

  const canEnterScore = isPlayer && m?.status !== 'completed' && (!m?.sets || m.sets.length === 0);

  if (q.loading && !q.data) return <Screen><ActivityIndicator color="#071C14" /></Screen>;
  if (q.error || !m) {
    return <Screen><Text className="text-red-700 mt-12">Match not found.</Text></Screen>;
  }

  return (
    <Screen refreshing={q.loading} onRefresh={() => q.refetch()}>
      <View className="gap-2 mt-4">
        <Label>Match . {m.status}</Label>
        <Heading>Doubles result</Heading>
        <Text className="text-sm text-ink-deep/70">
          {new Date(m.playedAt).toLocaleString()}
        </Text>
      </View>

      <Card>
        <Label>Team A</Label>
        {m.teamA.map((p) => (
          <Text key={p.userId} className="text-base text-ink-deep">
            {p.displayName ?? p.userId.slice(0, 8)}
          </Text>
        ))}
      </Card>
      <Card>
        <Label>Team B</Label>
        {m.teamB.map((p) => (
          <Text key={p.userId} className="text-base text-ink-deep">
            {p.displayName ?? p.userId.slice(0, 8)}
          </Text>
        ))}
      </Card>

      {m.sets && m.sets.length > 0 ? (
        <Card>
          <Label>Score</Label>
          {m.sets.map((s, i) => (
            <Text key={i} className="font-serif text-2xl text-ink-deep">
              Set {i + 1}: {s[0]} - {s[1]}
            </Text>
          ))}
          <Label>Verification: {m.verificationStatus ?? 'unverified'}</Label>
        </Card>
      ) : null}

      {canEnterScore ? <ScoreEntry matchId={m.id} onSubmitted={() => q.refetch()} /> : null}
    </Screen>
  );
}

function ScoreEntry({ matchId, onSubmitted }: { matchId: string; onSubmitted: () => void }) {
  const [sets, setSets] = useState<Array<[string, string]>>([['', ''], ['', '']]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, side: 0 | 1, val: string) {
    setSets((s) => {
      const copy = s.map((row) => [...row]) as Array<[string, string]>;
      const row = copy[i];
      if (!row) return copy;
      row[side] = val.replace(/[^0-9]/g, '').slice(0, 1);
      return copy;
    });
  }

  function addSet() {
    if (sets.length >= 5) return;
    setSets((s) => [...s, ['', '']]);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = sets
        .filter((s) => s[0] !== '' && s[1] !== '')
        .map((s) => [Number(s[0]), Number(s[1])] as [number, number]);
      if (payload.length < 2) throw new Error('Enter at least two sets.');
      await apiFetch(`/api/v1/matches/${matchId}/score`, {
        method: 'POST',
        body: JSON.stringify({ sets: payload }),
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${typeof e.body === 'string' ? e.body : 'Score failed'}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3 mt-6">
      <Text className="font-serif text-2xl text-ink-deep">Enter score</Text>
      {sets.map((s, i) => (
        <View key={i} className="flex-row gap-3 items-center">
          <Text className="text-sm text-ink-deep/60 w-16">Set {i + 1}</Text>
          <View className="flex-1">
            <Input value={s[0]} onChangeText={(v) => update(i, 0, v)} keyboardType="number-pad" placeholder="A" />
          </View>
          <Text className="text-ink-deep/40">-</Text>
          <View className="flex-1">
            <Input value={s[1]} onChangeText={(v) => update(i, 1, v)} keyboardType="number-pad" placeholder="B" />
          </View>
        </View>
      ))}
      {sets.length < 5 ? (
        <Pressable onPress={addSet}>
          <Text className="text-court text-xs uppercase tracking-[2px]">+ Add set</Text>
        </Pressable>
      ) : null}
      {error ? <Text className="text-red-700 text-sm">{error}</Text> : null}
      <Button onPress={submit} loading={busy}>Submit score</Button>
    </View>
  );
}
