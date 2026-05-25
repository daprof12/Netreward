import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Gamepad2, Plus, Pencil, Trash2, X, Check, Link2, AlertTriangle } from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { useGamingAccounts, GAMING_PLATFORMS, type GamingPlatform } from '@/hooks/useGamingAccounts';
import { useToastStore } from '@/stores/useToastStore';
import BottomSheet from '@/components/ui/BottomSheet';

const ALL_PLATFORMS = Object.keys(GAMING_PLATFORMS) as GamingPlatform[];

export default function GamingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { showToast } = useToastStore();
  const {
    gamingAccounts, linkedPlatforms, isLoading,
    linkAccount, isLinking,
    unlinkAccount, isUnlinking,
    updateAccount, isUpdating,
  } = useGamingAccounts();

  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<GamingPlatform | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const availablePlatforms = ALL_PLATFORMS.filter(p => !linkedPlatforms.has(p));

  const handleLink = async () => {
    if (!selectedPlatform || !usernameInput.trim()) {
      showToast('Enter your username', 'warning');
      return;
    }
    try {
      await linkAccount({ platform: selectedPlatform, username: usernameInput });
      showToast(`${GAMING_PLATFORMS[selectedPlatform].label} account linked!`, 'success');
      setShowLinkSheet(false);
      setSelectedPlatform(null);
      setUsernameInput('');
    } catch (err: any) {
      if (err.code === '23505') {
        showToast('This platform is already linked', 'warning');
      } else {
        showToast(err.message || 'Failed to link account', 'danger');
      }
    }
  };

  const handleUpdate = async (accountId: string) => {
    if (!editUsername.trim()) return;
    try {
      await updateAccount({ accountId, username: editUsername });
      showToast('Username updated', 'success');
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'danger');
    }
  };

  const handleUnlink = async () => {
    if (!removingId) return;
    try {
      await unlinkAccount(removingId);
      showToast('Account unlinked', 'success');
      setRemovingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to unlink', 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Gaming Accounts</Text>
        <Pressable 
          style={styles.addBtn}
          onPress={() => {
            if (availablePlatforms.length > 0) {
              setSelectedPlatform(availablePlatforms[0]);
              setUsernameInput('');
              setShowLinkSheet(true);
            }
          }}
          disabled={availablePlatforms.length === 0}
        >
          <Plus size={20} color={availablePlatforms.length > 0 ? '#fff' : colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Gamepad2 size={20} color={colors.accentPrimary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoDesc}>
              Link your gaming accounts once and they'll be automatically detected when you join Gaming campaigns.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 40 }} />
        ) : gamingAccounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Gamepad2 size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Accounts Linked</Text>
            <Text style={styles.emptyDesc}>Link your PlayStation, Xbox, Steam, etc. to earn NRT on gaming campaigns.</Text>
            
            <Pressable 
              style={styles.primaryBtn}
              onPress={() => {
                setSelectedPlatform(availablePlatforms[0]);
                setUsernameInput('');
                setShowLinkSheet(true);
              }}
            >
              <Text style={styles.primaryBtnText}>Link Gaming Account</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listHeader}>Linked Platforms ({gamingAccounts.length}/{ALL_PLATFORMS.length})</Text>
            
            {gamingAccounts.map(account => {
              const meta = GAMING_PLATFORMS[account.platform];
              const isEditing = editingId === account.id;

              return (
                <View key={account.id} style={styles.accountCard}>
                  <View style={styles.platformLogo}>
                    <Text style={styles.platformInitials}>{meta.label.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  
                  <View style={styles.accountInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.platformName}>{meta.label}</Text>
                      <View style={styles.linkedBadge}>
                        <Link2 size={10} color="#22c55e" />
                        <Text style={styles.linkedText}>Linked</Text>
                      </View>
                    </View>

                    {isEditing ? (
                      <View style={styles.editRow}>
                        <TextInput 
                          value={editUsername}
                          onChangeText={setEditUsername}
                          placeholder={meta.usernamePlaceholder}
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={styles.editInput}
                          autoFocus
                        />
                        <Pressable style={styles.saveAction} onPress={() => handleUpdate(account.id)} disabled={isUpdating}>
                          {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Check size={14} color="#fff" />}
                        </Pressable>
                        <Pressable style={styles.cancelAction} onPress={() => setEditingId(null)}>
                          <X size={14} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.usernameText}>
                        <Text style={{ fontWeight: 'bold' }}>{meta.usernameLabel}: </Text>
                        {account.platform_username}
                      </Text>
                    )}
                  </View>

                  {!isEditing && (
                    <View style={styles.actions}>
                      <Pressable 
                        style={styles.actionBtn}
                        onPress={() => { setEditingId(account.id); setEditUsername(account.platform_username); }}
                      >
                        <Pencil size={16} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable 
                        style={styles.actionBtnDanger}
                        onPress={() => setRemovingId(account.id)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={showLinkSheet} onClose={() => setShowLinkSheet(false)} title="Link Account">
        <View style={styles.sheetContent}>
          <Text style={styles.sheetLabel}>Select Platform</Text>
          <View style={styles.platformGrid}>
            {availablePlatforms.map(platform => {
              const meta = GAMING_PLATFORMS[platform];
              const isSelected = selectedPlatform === platform;
              return (
                <Pressable
                  key={platform}
                  style={[styles.platformOpt, isSelected && styles.platformOptActive]}
                  onPress={() => {
                    setSelectedPlatform(platform);
                    setUsernameInput('');
                  }}
                >
                  <Text style={[styles.platformOptText, isSelected && { color: colors.accentPrimary }]}>{meta.label}</Text>
                  {isSelected && <Check size={16} color={colors.accentPrimary} />}
                </Pressable>
              );
            })}
          </View>

          {selectedPlatform && (
            <View style={styles.usernameContainer}>
              <Text style={styles.sheetLabel}>{GAMING_PLATFORMS[selectedPlatform].usernameLabel}</Text>
              <TextInput 
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder={GAMING_PLATFORMS[selectedPlatform].usernamePlaceholder}
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.sheetInput}
              />
            </View>
          )}

          <Pressable 
            style={[styles.primaryBtn, { marginTop: 24 }, (isLinking || !selectedPlatform || !usernameInput.trim()) && { opacity: 0.5 }]}
            disabled={isLinking || !selectedPlatform || !usernameInput.trim()}
            onPress={handleLink}
          >
            {isLinking ? <ActivityIndicator size="small" color="#fff" /> : <Link2 size={20} color="#fff" />}
            <Text style={styles.primaryBtnText}>{isLinking ? 'Linking...' : 'Link Account'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <Modal visible={!!removingId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalIcon}>
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Unlink Account?</Text>
            <Text style={styles.modalDesc}>This gaming platform will no longer be detected when joining campaigns.</Text>
            
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setRemovingId(null)} disabled={isUnlinking}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDanger} onPress={handleUnlink} disabled={isUnlinking}>
                {isUnlinking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalDangerText}>Unlink</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  infoDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },

  listContainer: { gap: 12 },
  listHeader: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  
  accountCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  platformLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  platformInitials: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  accountInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  platformName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  linkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  linkedText: { fontSize: 10, fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase' },
  usernameText: { fontSize: 12, color: colors.textSecondary },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  editInput: { flex: 1, backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: colors.textPrimary },
  saveAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  cancelAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  actionBtnDanger: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },

  sheetContent: { paddingBottom: 20 },
  sheetLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  platformOpt: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 12 },
  platformOptActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: colors.accentPrimary },
  platformOptText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  
  usernameContainer: { marginTop: 12 },
  sheetInput: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 16, fontSize: 16, color: colors.textPrimary },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalDialog: { width: '100%', maxWidth: 320, backgroundColor: colors.bgSecondary, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center' },
  modalCancelText: { color: colors.textPrimary, fontWeight: 'bold' },
  modalDanger: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalDangerText: { color: '#fff', fontWeight: 'bold' },
});
