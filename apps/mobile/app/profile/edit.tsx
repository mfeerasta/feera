import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Label, Heading } from '../../src/components/label';
import { Input } from '../../src/components/input';
import { Button } from '../../src/components/button';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiFetch, ApiError } from '../../src/lib/api';

interface MeData {
  data?: {
    user?: {
      displayName: string | null;
      city: string | null;
      bio: string | null;
      locale: string | null;
    };
  };
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const me = useQuery<MeData>('/api/v1/me');

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data?.data?.user) {
      setDisplayName(me.data.data.user.displayName ?? '');
      setCity(me.data.data.user.city ?? '');
      setBio(me.data.data.user.bio ?? '');
    }
  }, [me.data]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName || undefined,
          city: city || null,
          bio: bio || null,
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
        <Label>Profile</Label>
        <Heading>Edit your details</Heading>
      </View>

      <View className="gap-3 mt-6">
        <Label>Display name</Label>
        <Input value={displayName} onChangeText={setDisplayName} placeholder="What we should call you" />

        <Label>City</Label>
        <Input value={city} onChangeText={setCity} placeholder="Lahore" />

        <Label>Bio</Label>
        <Input value={bio} onChangeText={setBio} placeholder="A short line about how you play." multiline numberOfLines={4} className="min-h-[100px]" />

        {error ? <Text className="text-red-700 text-sm">{error}</Text> : null}

        <View className="flex-row gap-3 mt-3">
          <View className="flex-1"><Button variant="outline" onPress={() => router.back()}>Cancel</Button></View>
          <View className="flex-1"><Button onPress={save} loading={busy}>Save</Button></View>
        </View>
      </View>
    </Screen>
  );
}
