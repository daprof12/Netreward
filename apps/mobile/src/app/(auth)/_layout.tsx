import { Stack } from 'expo-router';
import { useThemeColors } from '@/theme';

export default function AuthLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="pin-setup" />
    </Stack>
  );
}
