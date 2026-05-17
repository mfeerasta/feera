import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Home screen. Uses NativeWind className syntax with the flex.one-inspired
 * palette (ADR-0010): dark forest base, cream type, sharp corners, court
 * green for hover/CTA accent. Mirrors web aesthetic.
 */
export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-ink-deep">
      <View className="flex-1 px-6 justify-center gap-5">
        <Text className="text-[10px] tracking-[3px] text-cream/60 uppercase">
          {t('brand.wordmark')}
        </Text>
        <Text className="text-5xl font-serif text-cream leading-none">
          {t('home.hello')}
        </Text>
        <Text className="text-base text-cream/70 leading-6">
          {t('home.subtitle')}
        </Text>

        <View className="gap-3 mt-8">
          <Link href="/(auth)/sign-in" asChild>
            <Pressable className="border border-cream p-4 items-center">
              <Text className="text-cream">{t('auth.signInCta')}</Text>
            </Pressable>
          </Link>
          <Link href="/match/demo-id" asChild>
            <Pressable className="border border-cream/40 p-4 items-center">
              <Text className="text-cream/80">Open demo match</Text>
            </Pressable>
          </Link>
          <Link href="/club/lahore-padel" asChild>
            <Pressable className="border border-cream/40 p-4 items-center">
              <Text className="text-cream/80">Open demo club</Text>
            </Pressable>
          </Link>
          <Link href="/edition" asChild>
            <Pressable className="border border-brass p-4 items-center">
              <Text className="text-brass">{t('edition.title')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
