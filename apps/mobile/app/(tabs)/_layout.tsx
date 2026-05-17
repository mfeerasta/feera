import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F4D2C',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#FAF8F4', borderTopColor: '#1A1A1A11' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('home.title') }} />
      <Tabs.Screen name="discover" options={{ title: t('discover.title') }} />
      <Tabs.Screen name="tournaments" options={{ title: t('tournaments.title') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title') }} />
    </Tabs>
  );
}
