import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Mail, Smartphone, CreditCard, Package, MessageCircle, ShieldAlert } from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

interface Preferences {
  push: boolean;
  email: boolean;
  in_app: boolean;
  types: {
    payment: boolean;
    campaign: boolean;
    p2p: boolean;
    system: boolean;
  };
}

export default function NotificationSettingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      if (!user) return;
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (error || !data?.notification_preferences) {
        setPreferences({
          push: true, email: true, in_app: true,
          types: { payment: true, campaign: true, p2p: true, system: true }
        });
      } else {
        setPreferences(data.notification_preferences as Preferences);
      }
      setIsLoading(false);
    }
    fetchPreferences();
  }, [user]);

  const handleToggle = async (path: string, value: boolean) => {
    if (!preferences || !user) return;

    const newPrefs = { ...preferences };
    const parts = path.split('.');
    
    if (parts.length === 1) {
      (newPrefs as any)[parts[0]] = value;
    } else {
      (newPrefs as any)[parts[0]][parts[1]] = value;
    }

    setPreferences(newPrefs);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: newPrefs })
        .eq('id', user.id);

      if (error) throw error;
      showToast('Preferences updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating preferences', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = (title: string, desc: string, items: any[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDesc}>{desc}</Text>

      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={item.label} style={[styles.row, index !== items.length - 1 && styles.borderBottom]}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <item.icon size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
            <Switch
              value={!!item.value}
              onValueChange={(val) => handleToggle(item.path, val)}
              disabled={isSaving}
              trackColor={{ false: colors.bgPrimary, true: colors.accentPrimary }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          
          {renderSection('Channels', 'Choose how you want to receive alerts', [
            { icon: Smartphone, label: 'Push Notifications', path: 'push', value: preferences?.push },
            { icon: Mail, label: 'Email Alerts', path: 'email', value: preferences?.email },
            { icon: Bell, label: 'In-App Notifications', path: 'in_app', value: preferences?.in_app },
          ])}

          {renderSection('Notification Types', 'Select the categories you care about', [
            { icon: CreditCard, label: 'Payments & Scan2Pay', path: 'types.payment', value: preferences?.types.payment },
            { icon: Package, label: 'New Campaigns', path: 'types.campaign', value: preferences?.types.campaign },
            { icon: MessageCircle, label: 'P2P Trades', path: 'types.p2p', value: preferences?.types.p2p },
            { icon: ShieldAlert, label: 'System & Security', path: 'types.system', value: preferences?.types.system },
          ])}

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Note: Critical security alerts and essential transaction confirmations cannot be disabled for your protection.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },

  card: { backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  noticeBox: { backgroundColor: 'rgba(139, 92, 246, 0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.1)' },
  noticeText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});
