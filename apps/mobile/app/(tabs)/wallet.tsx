import { WalletScreen } from '../../src/screens/CoreScreens';
import SafeScreen from '../../src/components/ui/SafeScreen';

export default function WalletRoute() {
  return (
    <SafeScreen edges={['top']}>
      <WalletScreen />
    </SafeScreen>
  );
}
