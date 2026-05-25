import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Target, Calendar as CalendarIcon, DollarSign, RefreshCw, Calculator, ArrowRight, X, ChevronDown, MapPin } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useIspStore } from '@/stores/useIspStore';
import { type TargetLocation } from '@/stores/useSpStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useToastStore } from '@/stores/useToastStore';
import { useFormStore } from '@/stores/useFormStore';
import MapSelectionModal from '@/components/MapSelectionModal';

export default function CreateIspCampaignScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  
  const { user } = useAuthStore();
  const { networks, addCampaign } = useIspStore();
  const { balanceNRT, fetchBalance } = useWalletStore();
  const { showToast } = useToastStore();
  const { settings } = useSystemStore();

  const { drafts, updateCampaignDraft, clearCampaignDraft } = useFormStore();
  const draft = drafts.campaign;

  useEffect(() => {
    clearCampaignDraft();
    if (user) fetchBalance(user.id);
  }, [user]);

  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const networkId = draft.serviceId; 
  const name = draft.name;
  const targetLocations = draft.targetLocations || [];
  const budgetNrt = draft.budgetNrt;
  const startDate = draft.startDate;
  const endDate = draft.endDate;
  const isRecurring = draft.isRecurring;

  const selectedNetwork = networks.find(n => n.id === networkId);

  const estimatedReach = useMemo(() => {
    if (!budgetNrt || typeof budgetNrt !== 'number') return 0;
    return Math.floor((budgetNrt * settings.nrtUsdValue) / settings.targetReachCostUsd);
  }, [budgetNrt, settings.nrtUsdValue, settings.targetReachCostUsd]);

  const removeLocation = (id: string) => {
    updateCampaignDraft({ targetLocations: targetLocations.filter((l: any) => l.id !== id) });
  };

  const handleMapSave = (locations: TargetLocation[]) => {
    updateCampaignDraft({ targetLocations: locations });
  };

  const isBudgetValid = budgetNrt && typeof budgetNrt === 'number' && budgetNrt <= (balanceNRT || 0) && budgetNrt > 0;
  const canCreate = selectedNetwork && name.trim() && targetLocations.length > 0 && isBudgetValid && startDate && endDate;

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsSubmitting(true);
    
    try {
      await addCampaign({
        networkId,
        name,
        targetLocation: targetLocations,
        budgetNrt: Number(budgetNrt),
        rewardRate: 1 / settings.gbPerNrt,
        startDate,
        endDate,
        isRecurring,
        country: targetLocations[0]?.name?.split(',').pop()?.trim() || 'Global'
      });
      showToast('Campaign successfully launched!', 'success');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Error launching campaign', 'danger');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New ISP Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Network Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Verified Network</Text>
          {networks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>You need to create a Network first.</Text>
            </View>
          ) : (
            <>
              <Pressable onPress={() => setShowNetworkDropdown(true)} style={styles.dropdownBtn}>
                <Text style={{ color: selectedNetwork ? colors.textPrimary : colors.textSecondary, fontWeight: selectedNetwork ? 'bold' : 'normal' }}>
                  {selectedNetwork ? selectedNetwork.name : 'Choose a network...'}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>
            </>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Campaign Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Free Weekends Promo"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={(v) => updateCampaignDraft({ name: v })}
          />
        </View>

        {/* Target Location */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Target size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Target Location</Text>
          </View>

          <Pressable onPress={() => setShowMapModal(true)} style={styles.openMapBtn}>
            <MapPin size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.openMapBtnText}>Open Map to Select Audience</Text>
          </Pressable>

          {targetLocations.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {targetLocations.map((loc: any) => (
                <View key={loc.id} style={styles.chip}>
                  <MapPin size={12} color={colors.accentPrimary} style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>{loc.name.split(',')[0]}</Text>
                  <Text style={styles.chipRadius}> · {Math.round(loc.radiusKm)}km</Text>
                  <Pressable onPress={() => removeLocation(loc.id)} style={{ marginLeft: 6 }}><X size={12} color={colors.textSecondary} /></Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Budget */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <DollarSign size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Budget & Reach</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.label}>Total NRT Budget</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary }}>Available: {balanceNRT.toLocaleString()} NRT</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[10, 20, 50, 75, 100].map(pct => (
              <Pressable
                key={pct}
                onPress={() => updateCampaignDraft({ budgetNrt: balanceNRT * (pct / 100) })}
                style={styles.pctBtn}
              >
                <Text style={styles.pctBtnText}>{pct === 100 ? 'MAX' : `${pct}%`}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.budgetInputWrapper}>
            <Text style={styles.budgetCurrency}>NRT</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={budgetNrt ? budgetNrt.toString() : ''}
              onChangeText={(v) => {
                if (v === '') updateCampaignDraft({ budgetNrt: '' });
                else {
                  const num = parseFloat(v);
                  if (!isNaN(num)) updateCampaignDraft({ budgetNrt: num });
                }
              }}
            />
          </View>

          {budgetNrt !== '' && budgetNrt > balanceNRT && (
            <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Insufficient NRT balance</Text>
          )}

          <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 8 }}>
            Rate: ~1 NRT per {settings.gbPerNrt}GB Data
          </Text>

          {budgetNrt ? (
            <View style={styles.reachBox}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary, textTransform: 'uppercase' }}>Est. Users Reached</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary }}>{estimatedReach.toLocaleString()}</Text>
              </View>
              <View style={styles.reachIcon}><Target size={24} color={colors.accentPrimary} /></View>
            </View>
          ) : null}
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CalendarIcon size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Schedule</Text>
            </View>
            <Pressable onPress={() => updateCampaignDraft({ isRecurring: !isRecurring })} style={[styles.recurringBtn, isRecurring && styles.recurringBtnActive]}>
              <RefreshCw size={12} color={isRecurring ? colors.accentPrimary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: isRecurring ? colors.accentPrimary : colors.textSecondary }}>Recurring</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2023-12-01" placeholderTextColor={colors.textSecondary} value={startDate} onChangeText={(v) => updateCampaignDraft({ startDate: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2023-12-31" placeholderTextColor={colors.textSecondary} value={endDate} onChangeText={(v) => updateCampaignDraft({ endDate: v })} />
            </View>
          </View>
        </View>

        <Pressable 
          onPress={handleCreate} 
          disabled={!canCreate || isSubmitting}
          style={[styles.continueBtn, (!canCreate || isSubmitting) && { opacity: 0.5 }]}
        >
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.continueText}>Launch Campaign</Text>}
          {!isSubmitting && <ArrowRight size={18} color="#fff" />}
        </Pressable>
      </ScrollView>

      {/* Map Modal */}
      <MapSelectionModal
        isVisible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onSave={handleMapSave}
        initialLocations={targetLocations}
      />

      {/* Network Dropdown Modal */}
      <Modal visible={showNetworkDropdown} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>Select Network</Text>
              <Pressable onPress={() => setShowNetworkDropdown(false)}><X size={24} color={colors.textPrimary} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {networks.map(n => (
                <Pressable
                  key={n.id}
                  style={[styles.serviceOption, networkId === n.id && { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}
                  onPress={() => { updateCampaignDraft({ serviceId: n.id }); setShowNetworkDropdown(false); }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: networkId === n.id ? 'bold' : 'normal' }}>
                    {n.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  
  section: { marginBottom: 20 },
  card: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  
  label: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontSize: 14, marginBottom: 12 },
  
  emptyBox: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bgSecondary },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  
  openMapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: colors.accentPrimary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  openMapBtnText: { color: colors.accentPrimary, fontWeight: '600', fontSize: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 12, color: colors.textPrimary, fontWeight: 'bold' },
  chipRadius: { fontSize: 11, color: colors.textSecondary },

  pctBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  pctBtnText: { fontSize: 10, fontWeight: 'bold', color: colors.textPrimary },

  budgetInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16 },
  budgetCurrency: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, marginRight: 8 },
  budgetInput: { flex: 1, color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', paddingVertical: 12 },

  reachBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(167, 139, 250, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)', padding: 16, borderRadius: 12, marginTop: 12 },
  reachIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(167, 139, 250, 0.2)', alignItems: 'center', justifyContent: 'center' },

  recurringBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bgPrimary },
  recurringBtnActive: { backgroundColor: 'rgba(167, 139, 250, 0.2)' },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, paddingVertical: 16, borderRadius: 16, marginTop: 12 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  serviceOption: { paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
});
