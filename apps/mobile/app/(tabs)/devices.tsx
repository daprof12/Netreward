import { DevicesScreen } from '../../src/screens/CoreScreens';
import SafeScreen from '../../src/components/ui/SafeScreen';

export default function DevicesRoute() {
  return (
    <SafeScreen edges={['top']}>
      <DevicesScreen />
    </SafeScreen>
  );
}
