import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera as CameraIcon, SwitchCamera } from 'lucide-react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';

const { width } = Dimensions.get('window');

export default function ScanToPayScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    // Usually, we'd navigate to a payment summary screen or show a bottom sheet here
    Alert.alert('Scanned Address', data, [
      { text: 'OK', onPress: () => setScanned(false) }
    ]);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    // Permission state is loading
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Permission denied or not granted yet
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgSecondary }]}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Scan2Pay</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrapper}>
            <CameraIcon size={32} color={colors.accentPrimary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>Starting Camera</Text>
          <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>Please allow camera access when prompted.</Text>
          <ActivityIndicator size="small" color={colors.accentPrimary} style={{ marginTop: 24 }} />
          <Pressable style={[styles.grantBtn, { backgroundColor: colors.accentPrimary }]} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.absoluteFill} 
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
          {/* Header Overlay */}
          <View style={styles.headerOverlay}>
            <Pressable onPress={() => router.back()} style={styles.overlayBackBtn}>
              <ChevronLeft size={24} color="#000" />
            </Pressable>
            <Text style={styles.overlayTitle}>Scan2Pay</Text>
            <Pressable onPress={toggleCameraFacing} style={styles.overlayToggleBtn}>
              <SwitchCamera size={16} color={colors.accentPrimary} />
              <Text style={[styles.overlayToggleText, { color: colors.accentPrimary }]}>
                {facing === 'back' ? 'Rear' : 'Front'}
              </Text>
            </Pressable>
          </View>

          {/* Viewfinder overlay */}
          <View style={styles.viewfinderContainer}>
            <Text style={styles.viewfinderTitle}>Scan QR Code</Text>
            <Text style={styles.viewfinderSubtitle}>Align the merchant's QR code within the frame</Text>

            <View style={styles.viewfinderBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Bottom Pill */}
          <View style={styles.bottomContainer}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Camera active — point at a QR code</Text>
            </View>
          </View>

        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  safeArea: { flex: 1 },
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  permissionIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  permissionSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  grantBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 32 },
  grantBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  headerOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 },
  overlayBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  overlayTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  overlayToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  overlayToggleText: { fontSize: 12, fontWeight: 'bold' },

  viewfinderContainer: { alignItems: 'center', marginTop: -100 },
  viewfinderTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  viewfinderSubtitle: { fontSize: 13, color: '#fff', opacity: 0.9, marginBottom: 40, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  
  viewfinderBox: { width: width * 0.65, height: width * 0.65, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: colors.accentPrimary, borderWidth: 0 },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },

  bottomContainer: { paddingBottom: 40, alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentPrimary },
  statusText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
