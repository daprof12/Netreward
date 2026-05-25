import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import UserDevicesView from '@/screens/UserDevicesView';
import SpDevicesView from '@/screens/SpDevicesView';
import IspDevicesView from '@/screens/IspDevicesView';

export default function DevicesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { role } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      {role === 'sp' ? (
        <SpDevicesView />
      ) : role === 'isp' ? (
        <IspDevicesView />
      ) : (
        <UserDevicesView />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
});
