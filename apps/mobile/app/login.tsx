import { LoginScreen } from '../src/screens/CoreScreens';
import SafeScreen from '../src/components/ui/SafeScreen';

export default function LoginRoute() {
  return (
    <SafeScreen edges={['top', 'bottom']}>
      <LoginScreen />
    </SafeScreen>
  );
}
