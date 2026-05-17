import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '../../src/components/screen';
import { Button } from '../../src/components/button';

/**
 * Feera Edition microsite (mobile mirror of /edition on web).
 * Quiet, restrained, editorial tone. Brass accent only.
 */
export default function EditionScreen() {
  const router = useRouter();

  return (
    <Screen variant="ink">
      <View className="gap-4 mt-12">
        <Text className="text-brass text-[10px] uppercase tracking-[4px]">EDITION</Text>
        <Text className="font-serif text-5xl text-cream leading-tight">
          A quieter way to play.
        </Text>
        <Text className="text-base text-cream/70 leading-6 mt-2">
          Feera Edition is a small, by-invitation circle of clubs and players. Curated
          tournaments. Single-table dinners. Match formats designed to be remembered.
        </Text>
      </View>

      <View className="gap-6 mt-12">
        <Pillar title="Curated draws" body="Sixteen players, two days, one trophy. No live leaderboards in the public app." />
        <Pillar title="Member clubs" body="Lahore, Lisbon, Dubai. New rooms added once a year." />
        <Pillar title="Restrained tools" body="A printed program. A pen. A page on the website. That is the surface." />
      </View>

      <View className="gap-3 mt-12">
        <Button
          variant="brass"
          onPress={() => Linking.openURL('https://www.feera.ai/edition/apply')}
        >
          Apply for invitation
        </Button>
        <Button variant="ghost" onPress={() => router.back()}>
          Return
        </Button>
      </View>

      <Text className="text-cream/30 text-[10px] uppercase tracking-[3px] text-center mt-16 mb-8">
        Feera Edition . Established 2026
      </Text>
    </Screen>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <View className="border-t border-cream/15 pt-4 gap-2">
      <Text className="font-serif text-2xl text-cream">{title}</Text>
      <Text className="text-sm text-cream/70 leading-6">{body}</Text>
    </View>
  );
}
