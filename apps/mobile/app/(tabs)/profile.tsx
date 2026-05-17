import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '../../src/components/screen';
import { Card } from '../../src/components/card';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { useQuery } from '../../src/lib/hooks/use-query';
import { apiBaseUrl } from '../../src/lib/api';
import { authClient } from '../../src/auth/client';

interface MeData {
  data?: {
    user?: {
      id: string;
      displayName: string | null;
      email: string | null;
      phone: string | null;
      city: string | null;
      countryCode: string | null;
      editionMemberStatus: string | null;
      isVerifiedCoach: boolean | null;
    };
    rating?: {
      ratingDisplay: number | null;
      reliabilityPct: number | null;
      matchCount: number | null;
      isProvisional: boolean | null;
    } | null;
  };
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const me = useQuery<MeData>('/api/v1/me');

  const user = me.data?.data?.user;
  const rating = me.data?.data?.rating;

  async function signOut() {
    try {
      await authClient.signOut();
    } catch {
      // swallow; AuthGate handles redirect.
    }
  }

  return (
    <Screen variant="cream" refreshing={me.loading} onRefresh={() => me.refetch()}>
      <View className="gap-2 mt-4">
        <Label>{t('profile.title')}</Label>
        {me.loading && !user ? (
          <ActivityIndicator color="#071C14" />
        ) : (
          <Heading>{user?.displayName ?? 'Player'}</Heading>
        )}
        <Text className="text-sm text-ink-deep/70">
          {[user?.city, user?.countryCode].filter(Boolean).join(', ') || t('profile.subtitle')}
        </Text>
      </View>

      <Card>
        <Label>Rating</Label>
        {rating ? (
          <>
            <Text className="font-serif text-4xl text-ink-deep">
              {rating.ratingDisplay != null ? rating.ratingDisplay.toFixed(1) : '-'}
            </Text>
            <Text className="text-xs text-ink-deep/60">
              {rating.matchCount ?? 0} matches . reliability {rating.reliabilityPct ?? 0}%
              {rating.isProvisional ? ' . provisional' : ''}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-ink-deep/70">
            Play your first match to receive a rating.
          </Text>
        )}
      </Card>

      {user?.editionMemberStatus && user.editionMemberStatus !== 'none' ? (
        <Card variant="ink">
          <Text className="text-brass text-[10px] uppercase tracking-[3px]">Edition</Text>
          <Text className="font-serif text-2xl text-cream">{user.editionMemberStatus}</Text>
        </Card>
      ) : null}

      <View className="gap-3 mt-6">
        <Button variant="outline" onPress={() => router.push('/profile/edit')}>
          Edit profile
        </Button>
        <Button variant="outline" onPress={() => router.push('/profile/privacy')}>
          Privacy and women pool
        </Button>
        <Button
          variant="outline"
          onPress={() => Linking.openURL(`${apiBaseUrl()}/api/v1/me/export`)}
        >
          Export my data
        </Button>
        <Button variant="brass" onPress={signOut}>Sign out</Button>
      </View>
    </Screen>
  );
}
