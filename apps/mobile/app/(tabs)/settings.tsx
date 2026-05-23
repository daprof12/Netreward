import { SettingsScreen } from '../../src/screens/CoreScreens';
import SafeScreen from '../../src/components/ui/SafeScreen';

export default function SettingsRoute() {
  return (
    <SafeScreen edges={['top']}>
      <SettingsScreen />
    </SafeScreen>
  );
}
