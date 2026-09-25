import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getApiBase } from '../cases/case-service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerDevice() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hand-backs', {
      name: 'Things that need you',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted'
    ? current
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await fetch(`${getApiBase()}/api/notifications/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-carry-owner': 'alpha-local' },
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
}

function openNotification(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
}

export function useCarryNotifications() {
  useEffect(() => {
    void registerDevice().catch((error) => console.warn('carry_notification_registration_failed', error));

    const initial = Notifications.getLastNotificationResponse();
    if (initial?.notification) openNotification(initial.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });

    return () => subscription.remove();
  }, []);
}
