import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#1A1A1A' }}>
          {t('club.title')}
        </Text>
        <Text style={{ fontSize: 16, color: '#555' }}>{t('club.subtitle')}</Text>
        <Text style={{ fontSize: 14, color: '#0F4D2C', marginTop: 8 }}>club slug: {slug}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Route: /club/[slug]. Booking + leaderboard land in M5.
        </Text>
      </View>
    </SafeAreaView>
  );
}
