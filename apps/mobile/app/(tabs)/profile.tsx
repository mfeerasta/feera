import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#1A1A1A' }}>
          {t('profile.title')}
        </Text>
        <Text style={{ fontSize: 16, color: '#555' }}>{t('profile.subtitle')}</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Route: /(tabs)/profile. Rating + settings land in M4.
        </Text>
      </View>
    </SafeAreaView>
  );
}
