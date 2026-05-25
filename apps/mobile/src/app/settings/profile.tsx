import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, Phone, Lock, Save, Camera, AlertCircle } from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useProfile } from '@/hooks/useProfile';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { supabase } from '@/lib/supabase';

export default function ProfileSettingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, profile, role } = useAuthStore();
  const { updateProfile, isUpdating } = useProfile();
  const { profileLogo: spLogo } = useSpStore();
  const { profileLogo: ispLogo } = useIspStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  
  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuggestion, setNameSuggestion] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);

  useEffect(() => {
    if (!displayName || displayName.trim() === profile?.display_name) {
      setNameError(null);
      setNameSuggestion(null);
      return;
    }
    if (displayName.trim().length < 2) {
      setNameError('Display name must be at least 2 characters');
      setNameSuggestion(null);
      return;
    }

    const checkName = async () => {
      setIsCheckingName(true);
      try {
        const { data, error } = await supabase.rpc('check_display_name_availability', {
          p_display_name: displayName.trim()
        });
        if (error) throw error;
        if (data && !data.available) {
          setNameError('Display name is taken');
          if (data.suggestion) setNameSuggestion(data.suggestion);
        } else {
          setNameError(null);
          setNameSuggestion(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingName(false);
      }
    };

    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [displayName, profile?.display_name]);

  const handleSaveProfile = async () => {
    if (nameError) {
      showToast('Please fix the errors before saving', 'success');
      return;
    }
    try {
      await updateProfile({ display_name: displayName, phone });
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'success');
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'success');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.message || 'Failed to change password', 'success');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const avatarUrl = role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}</Text>
              )}
            </View>
            <Pressable 
              style={styles.cameraBtn}
              onPress={() => showToast('Image picker not implemented in this demo', 'success')}
            >
              <Camera size={14} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.displayName}>{profile?.display_name || user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.tabsContainer}>
          <Pressable 
            style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Edit Profile</Text>
          </Pressable>
          <Pressable 
            style={[styles.tabBtn, activeTab === 'password' && styles.tabBtnActive]}
            onPress={() => setActiveTab('password')}
          >
            <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>Password</Text>
          </Pressable>
        </View>

        {activeTab === 'profile' ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{role === 'sp' || role === 'isp' ? 'Company / Merchant Name' : 'Display Name'}</Text>
              <View style={[styles.inputWrapper, nameError ? { borderColor: colors.error } : {}]}>
                <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={role === 'sp' || role === 'isp' ? 'Enter company or brand name' : 'Enter your display name'}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.input}
                />
                {isCheckingName && <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 16 }} />}
              </View>
              {nameError && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={12} color={colors.error} />
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              )}
              {nameSuggestion && (
                <Text style={styles.suggestionText}>
                  Suggestion: <Text style={styles.suggestionHighlight} onPress={() => { setDisplayName(nameSuggestion); setNameError(null); setNameSuggestion(null); }}>{nameSuggestion}</Text>
                </Text>
              )}
              <Text style={styles.helperText}>
                {role === 'sp' || role === 'isp' 
                  ? 'This is your company name shown to users, on payments, and across the platform.' 
                  : 'This is how your name will appear publicly.'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={user?.email || ''}
                  editable={false}
                  style={[styles.input, { color: colors.textSecondary }]}
                />
              </View>
              <Text style={styles.helperTextAccent}>Contact support to change email</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, (isUpdating || !!nameError || isCheckingName) && { opacity: 0.5 }]} 
              disabled={isUpdating || !!nameError || isCheckingName}
              onPress={handleSaveProfile}
            >
              {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Save size={20} color="#fff" />}
              <Text style={styles.saveBtnText}>{isUpdating ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable 
              style={[styles.saveBtn, isUpdatingPassword && { opacity: 0.5 }]} 
              disabled={isUpdatingPassword}
              onPress={handleSavePassword}
            >
              {isUpdatingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Lock size={20} color="#fff" />}
              <Text style={styles.saveBtnText}>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  avatarContainer: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  displayName: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
  emailText: { fontSize: 14, color: colors.textSecondary },

  tabsContainer: { flexDirection: 'row', backgroundColor: colors.bgSecondary, padding: 4, borderRadius: 12, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.bgPrimary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary },

  formContainer: { gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16 },
  inputIcon: { marginLeft: 16, marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 16, fontSize: 16, color: colors.textPrimary },
  helperText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4, marginTop: 4 },
  helperTextAccent: { fontSize: 12, color: colors.accentPrimary, marginLeft: 4, marginTop: 4 },
  
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4, marginTop: 4 },
  errorText: { fontSize: 12, color: colors.error },
  suggestionText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4, marginTop: 4 },
  suggestionHighlight: { color: colors.accentPrimary, fontWeight: 'bold' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
