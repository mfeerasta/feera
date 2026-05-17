import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#437E5B',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#F6F3EE',
          borderTopColor: '#DDDDDD',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('home.title') }} />
      <Tabs.Screen name="discover" options={{ title: t('discover.title') }} />
      <Tabs.Screen name="tournaments" options={{ title: t('tournaments.title') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title') }} />
    </Tabs>
  );
}
