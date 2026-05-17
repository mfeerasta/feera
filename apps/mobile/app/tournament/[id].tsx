import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiFetch, ApiError } from '../../src/lib/api';
import { useState } from 'react';

interface Standing {
  participantId: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  teamName: string | null;
}

interface TournamentDetail {
  tournament: {
    id: string;
    name: string;
    format: string;
    city: string | null;
    countryCode: string;
    startAt: string;
    endAt: string;
    entryFee: number;
    currency: string;
    status: string;
    description: string | null;
  };
  standings: Standing[];
}

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery<{ data: TournamentDetail }>(id ? `/api/v1/tournaments/${id}` : null, [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (q.loading && !q.data) return <Screen><ActivityIndicator color="#071C14" /></Screen>;
  if (q.error || !q.data?.data) {
    return <Screen><Text className="text-red-700 mt-12">Tournament not found.</Text></Screen>;
  }

  const { tournament: t, standings } = q.data.data;

  async function register() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/tournaments/${id}/registrations`, { method: 'POST', body: JSON.stringify({}) });
      await q.refetch();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${typeof e.body === 'string' ? e.body : 'Registration failed'}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={q.loading} onRefresh={() => q.refetch()}>
      <View className="gap-2 mt-4">
        <Label>{t.format.replace(/_/g, ' ')} . {t.countryCode}</Label>
        <Heading>{t.name}</Heading>
        <Text className="text-sm text-ink-deep/70">
          {t.city ?? 'Online'} . {new Date(t.startAt).toLocaleString()}
        </Text>
      </View>

      {t.description ? (
        <Text className="text-sm text-ink-deep/80 leading-6 mt-4">{t.description}</Text>
      ) : null}

      <Card>
        <Label>Entry</Label>
        <Text className="font-serif text-3xl text-ink-deep">
          {t.entryFee > 0 ? `${t.entryFee} ${t.currency}` : 'Free'}
        </Text>
      </Card>

      {t.status === 'open' ? (
        <Button onPress={register} loading={busy}>Register</Button>
      ) : (
        <Text className="text-sm text-ink-deep/60 text-center">Registration closed</Text>
      )}
      {error ? <Text className="text-red-700 text-sm">{error}</Text> : null}

      <View className="gap-3 mt-8">
        <Text className="font-serif text-2xl text-ink-deep">Standings</Text>
        {standings.length === 0 ? (
          <Text className="text-sm text-ink-deep/60">Standings appear once play starts.</Text>
        ) : (
          standings.map((s) => (
            <View key={s.participantId} className="flex-row border-b border-ink-deep/10 py-2">
              <Text className="text-sm text-ink-deep/60 w-8">{s.rank}</Text>
              <Text className="text-sm text-ink-deep flex-1">{s.teamName ?? s.participantId.slice(0, 8)}</Text>
              <Text className="text-sm text-ink-deep w-12 text-right">{s.wins}-{s.losses}</Text>
              <Text className="text-sm text-court w-10 text-right">{s.points}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
