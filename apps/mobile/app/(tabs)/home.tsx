import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Home screen. Uses NativeWind className syntax with brand tokens
 * (court green, cream) to prove the Tailwind 3.4 + NativeWind v4 wiring.
 */
export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-6 justify-center gap-4">
        <Text className="text-xs tracking-[2px] text-court-primary">
          {t('brand.wordmark')}
        </Text>
        <Text className="text-4xl font-semibold text-charcoal">
          {t('home.hello')}
        </Text>
        <Text className="text-base text-charcoal/70 leading-6">
          {t('home.subtitle')}
        </Text>

        <View className="gap-2 mt-6">
          <Link href="/(auth)/sign-in" asChild>
            <Pressable className="bg-court-primary rounded-xl p-4 items-center">
              <Text className="text-cream font-semibold">{t('auth.signInCta')}</Text>
            </Pressable>
          </Link>
          <Link href="/match/demo-id" asChild>
            <Pressable className="border border-court-primary/30 rounded-xl p-4 items-center">
              <Text className="text-court-primary">Open demo match</Text>
            </Pressable>
          </Link>
          <Link href="/club/lahore-padel" asChild>
            <Pressable className="border border-court-primary/30 rounded-xl p-4 items-center">
              <Text className="text-court-primary">Open demo club</Text>
            </Pressable>
          </Link>
          <Link href="/edition" asChild>
            <Pressable className="border border-court-primary/30 rounded-xl p-4 items-center">
              <Text className="text-court-primary">{t('edition.title')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
