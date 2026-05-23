import { CampaignsScreen } from '../../src/screens/CoreScreens';
import SafeScreen from '../../src/components/ui/SafeScreen';

export default function CampaignsRoute() {
  return (
    <SafeScreen edges={['top']}>
      <CampaignsScreen />
    </SafeScreen>
  );
}
