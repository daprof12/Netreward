import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import UserCampaignsView from '@/screens/UserCampaignsView';
import SpCampaignsView from '@/screens/SpCampaignsView';
import IspCampaignsView from '@/screens/IspCampaignsView';

export default function CampaignsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const role = useAuthStore((state) => state.role);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {role === 'sp' ? (
        <SpCampaignsView />
      ) : role === 'isp' ? (
        <IspCampaignsView />
      ) : (
        <UserCampaignsView />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
});
