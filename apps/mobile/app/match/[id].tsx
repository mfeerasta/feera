import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#1A1A1A' }}>
          {t('match.title')}
        </Text>
        <Text style={{ fontSize: 16, color: '#555' }}>{t('match.subtitle')}</Text>
        <Text style={{ fontSize: 14, color: '#0F4D2C', marginTop: 8 }}>match id: {id}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Route: /match/[id]. Live scoring lands in M6.
        </Text>
      </View>
    </SafeAreaView>
  );
}
