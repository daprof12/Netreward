import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';

export default function VerifiedExchangerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Verified Exchangers</Text>
          <Text style={styles.headerSubtitle}>Trusted platforms for buying NRT</Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.banner}>
          <ShieldCheck size={16} color={colors.success} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>All listed exchangers are verified by the NetReward team</Text>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No verified exchangers available yet.</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            NetReward is not responsible for third-party exchanger terms or rates. Always verify before transacting.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  
  container: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: 40 },
  bannerText: { fontSize: 11, fontWeight: 'bold', color: colors.success },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  footer: { marginTop: 'auto', paddingHorizontal: 20 },
  footerText: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
