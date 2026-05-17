import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TournamentsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#1A1A1A' }}>
          {t('tournaments.title')}
        </Text>
        <Text style={{ fontSize: 16, color: '#555' }}>{t('tournaments.subtitle')}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Route: /(tabs)/tournaments. Brackets land in M7.
        </Text>
      </View>
    </SafeAreaView>
  );
}
