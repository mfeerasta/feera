import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import type { ReactNode } from 'react';

import { setupI18n } from '../src/i18n';
import { authClient } from '../src/auth/client';
import { registerForPushNotificationsAsync } from '../src/lib/push';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setupI18n();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-deep">
        <ActivityIndicator color="#F6F3EE" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="match/[id]" />
          <Stack.Screen name="club/[slug]" />
          <Stack.Screen name="court/[id]" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="tournament/[id]" />
          <Stack.Screen name="open-matches" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="profile/privacy" />
          <Stack.Screen name="edition/index" />
        </Stack>
      </AuthGate>
    </GestureHandlerRootView>
  );
}

/**
 * Redirects to (auth)/sign-in when there is no session, and pushes back to
 * (tabs)/home once a session is established. Also registers the device push
 * token after sign-in.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [session, isPending, segments, router]);

  useEffect(() => {
    if (session) {
      void registerForPushNotificationsAsync().catch(() => undefined);
    }
  }, [session]);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-deep">
        <ActivityIndicator color="#F6F3EE" />
      </View>
    );
  }

  return <>{children}</>;
}
