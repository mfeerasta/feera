import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function EditionScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F0E6' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 12, letterSpacing: 3, color: '#0A2E1D' }}>EDITION</Text>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '500',
            color: '#0A2E1D',
            fontFamily: 'Georgia',
          }}
        >
          {t('edition.title')}
        </Text>
        <Text style={{ fontSize: 16, color: '#0A2E1D99' }}>{t('edition.subtitle')}</Text>
        <Text style={{ fontSize: 12, color: '#0A2E1D77', marginTop: 12 }}>
          Route: /edition. Curated draws land in M7.
        </Text>
      </View>
    </SafeAreaView>
  );
}
