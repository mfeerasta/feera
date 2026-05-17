import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiFetch, ApiError } from '../../src/lib/api';

type Visibility = 'public' | 'friends' | 'private';
type Gender = 'm' | 'f' | 'x' | null;

interface MeData {
  data?: {
    user?: {
      gender: Gender;
      genderVisibility: Visibility;
    };
  };
}

export default function PrivacyScreen() {
  const router = useRouter();
  const me = useQuery<MeData>('/api/v1/me');

  const [gender, setGender] = useState<Gender>(null);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [womenPool, setWomenPool] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = me.data?.data?.user;
    if (u) {
      setGender(u.gender ?? null);
      setVisibility(u.genderVisibility ?? 'public');
    }
  }, [me.data]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({
          gender,
          genderVisibility: visibility,
          womenOnlyPoolOptIn: gender === 'f' ? womenPool : false,
        }),
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${typeof e.body === 'string' ? e.body : 'Save failed'}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View className="gap-2 mt-4">
        <Label>Privacy</Label>
        <Heading>Visibility and pools</Heading>
        <Text className="text-sm text-ink-deep/70">
          You control who can see your details and which match pools you appear in.
        </Text>
      </View>

      <View className="gap-3 mt-6">
        <Label>Gender</Label>
        <View className="flex-row gap-2 flex-wrap">
          {([['m', 'Man'], ['f', 'Woman'], ['x', 'Other'], [null, 'Prefer not to say']] as const).map(([g, l]) => (
            <Pressable
              key={String(g)}
              onPress={() => setGender(g)}
              className={`border px-4 py-2 ${gender === g ? 'border-court bg-court' : 'border-ink-deep/20 bg-paper'}`}
            >
              <Text className={`text-xs uppercase tracking-[1px] ${gender === g ? 'text-cream' : 'text-ink-deep/70'}`}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>

        <Label>Who can see your gender</Label>
        <View className="flex-row gap-2 flex-wrap">
          {(['public', 'friends', 'private'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVisibility(v)}
              className={`border px-4 py-2 ${visibility === v ? 'border-court bg-court' : 'border-ink-deep/20 bg-paper'}`}
            >
              <Text className={`text-xs uppercase tracking-[1px] ${visibility === v ? 'text-cream' : 'text-ink-deep/70'}`}>{v}</Text>
            </Pressable>
          ))}
        </View>

        {gender === 'f' ? (
          <View className="border border-brass/40 p-4 mt-2 gap-2">
            <Label>Women-only pool</Label>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-ink-deep flex-1 me-3">
                Show me in the women-only match pool. You can toggle this any time.
              </Text>
              <Switch value={womenPool} onValueChange={setWomenPool} />
            </View>
          </View>
        ) : null}

        {error ? <Text className="text-red-700 text-sm">{error}</Text> : null}

        <View className="flex-row gap-3 mt-3">
          <View className="flex-1"><Button variant="outline" onPress={() => router.back()}>Cancel</Button></View>
          <View className="flex-1"><Button onPress={save} loading={busy}>Save</Button></View>
        </View>
      </View>
    </Screen>
  );
}
