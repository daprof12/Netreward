import { HomeScreen } from '../../src/screens/CoreScreens';
import SafeScreen from '../../src/components/ui/SafeScreen';

export default function HomeRoute() {
  return (
    <SafeScreen edges={['top']}>
      <HomeScreen />
    </SafeScreen>
  );
}
