import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F4' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 12, letterSpacing: 2, color: '#0F4D2C' }}>
          {t('brand.wordmark')}
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '600', color: '#1A1A1A' }}>
          {t('auth.signIn')}
        </Text>
        <Text style={{ fontSize: 16, color: '#555' }}>{t('auth.signInSubtitle')}</Text>
        <TextInput
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          style={{
            borderWidth: 1,
            borderColor: '#1A1A1A22',
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            marginTop: 12,
          }}
        />
        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={{
            backgroundColor: '#0F4D2C',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FAF8F4', fontWeight: '600' }}>{t('auth.continue')}</Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
          OTP flow lands in M3. This is a navigation breadcrumb only.
        </Text>
      </View>
    </SafeAreaView>
  );
}
