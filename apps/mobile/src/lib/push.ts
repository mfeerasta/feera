/**
 * Expo push notification registration helper. Wires the device token into the
 * server via POST /api/v1/me/push-tokens. Safe to call on every app open: the
 * server upserts.
 *
 * The actual notification trigger logic lives server-side
 * (packages/notifications). This file is the device side: ask for permission,
 * fetch the Expo push token, send it up.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiFetch } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#437E5B',
    });
  }

  const easExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas;
  const projectId = easExtra?.projectId && easExtra.projectId.length > 0 ? easExtra.projectId : undefined;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;

  try {
    await apiFetch('/api/v1/me/push-tokens', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: 'expo',
        deviceName: Device.deviceName ?? undefined,
        appVersion: Constants.expoConfig?.version,
      }),
    });
  } catch {
    // Non-fatal: notifications stay best-effort.
  }

  return token;
}
