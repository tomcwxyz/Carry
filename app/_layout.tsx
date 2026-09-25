import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useCarryNotifications } from '../src/features/notifications/useCarryNotifications';
import { colours } from '../src/theme/tokens';

export default function RootLayout() {
  useCarryNotifications();

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colours.paper },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="cases/index" />
        <Stack.Screen name="cases/[id]" />
        <Stack.Screen name="you" />
        <Stack.Screen
          name="capture"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
