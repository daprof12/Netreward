import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Target, Calendar as CalendarIcon, DollarSign, RefreshCw, Calculator, X, ChevronDown, Save } from 'lucide-react-native';
import { useIspStore } from '@/stores/useIspStore';
import { type TargetLocation } from '@/stores/useSpStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useToastStore } from '@/stores/useToastStore';
import MapSelectionModal from '@/components/MapSelectionModal';
import { MapPin } from 'lucide-react-native';

export default function EditIspCampaignScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const { networks, campaigns, updateCampaign, isLoading } = useIspStore();
  const { balanceNRT } = useWalletStore();
  const { showToast } = useToastStore();
  const { settings } = useSystemStore();

  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const [networkId, setNetworkId] = useState('');
  const [name, setName] = useState('');
  const [targetLocations, setTargetLocations] = useState<TargetLocation[]>([]);
  const [budgetNrt, setBudgetNrt] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [initialBudget, setInitialBudget] = useState(0);
  const [spentNrt, setSpentNrt] = useState(0);

  useEffect(() => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      setNetworkId(campaign.networkId);
      setName(campaign.name);
      setTargetLocations(campaign.targetLocation || []);
      setBudgetNrt(campaign.budgetNrt);
      setInitialBudget(campaign.budgetNrt);
      setSpentNrt(campaign.spentNrt || 0);
      setStartDate(campaign.startDate ? campaign.startDate.split('T')[0] : '');
      setEndDate(campaign.endDate ? campaign.endDate.split('T')[0] : '');
      setIsRecurring(campaign.isRecurring);
    } else if (!isLoading) {
      showToast('Campaign not found', 'danger');
      router.back();
    }
  }, [id, campaigns, isLoading, router, showToast]);

  const selectedNetwork = networks.find(n => n.id === networkId);

  const estimatedReach = useMemo(() => {
    if (!budgetNrt || typeof budgetNrt !== 'number') return 0;
    return Math.floor((budgetNrt * settings.nrtUsdValue) / settings.targetReachCostUsd);
  }, [budgetNrt, settings.nrtUsdValue, settings.targetReachCostUsd]);

  const removeLocation = (locId: string) => {
    setTargetLocations(targetLocations.filter(l => l.id !== locId));
  };

  const handleMapSave = (locations: TargetLocation[]) => {
    setTargetLocations(locations);
  };

  const additionalBudgetNeeded = (typeof budgetNrt === 'number' ? budgetNrt : 0) - initialBudget;
  const isBelowSpent = typeof budgetNrt === 'number' && budgetNrt < spentNrt;
  const isBudgetValid = budgetNrt && typeof budgetNrt === 'number' && !isBelowSpent && (additionalBudgetNeeded <= 0 || additionalBudgetNeeded <= balanceNRT) && budgetNrt > 0;
  
  const canSave = networkId && name.trim() && targetLocations.length > 0 && isBudgetValid && startDate && endDate;

  const handleSave = async () => {
    if (!canSave || !id) return;
    setIsSubmitting(true);
    
    try {
      await updateCampaign(id as string, {
        networkId,
        name,
        targetLocation: targetLocations,
        budgetNrt: Number(budgetNrt),
        startDate,
        endDate,
        isRecurring,
        country: targetLocations[0]?.name?.split(',').pop()?.trim() || 'Global'
      });
      showToast('Campaign updated successfully!', 'success');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Error updating campaign', 'danger');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit ISP Campaign</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={!canSave || isSubmitting} 
          style={[styles.saveBtn, (!canSave || isSubmitting) && { opacity: 0.5 }]}
        >
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Network Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Network</Text>
          <Pressable onPress={() => setShowNetworkDropdown(true)} style={styles.dropdownBtn}>
            <Text style={{ color: selectedNetwork ? colors.textPrimary : colors.textSecondary, fontWeight: selectedNetwork ? 'bold' : 'normal' }}>
              {selectedNetwork ? selectedNetwork.name : 'Choose a network...'}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Pressable>

          <Text style={[styles.label, { marginTop: 16 }]}>Campaign Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Free Weekends Promo"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
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

          <View style={styles.budgetInputWrapper}>
            <Text style={styles.budgetCurrency}>NRT</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={budgetNrt ? budgetNrt.toString() : ''}
              onChangeText={(v) => {
                if (v === '') setBudgetNrt('');
                else {
                  const num = parseFloat(v);
                  if (!isNaN(num)) setBudgetNrt(num);
                }
              }}
            />
          </View>

          {additionalBudgetNeeded > balanceNRT && (
            <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Insufficient NRT balance for increase</Text>
          )}
          {isBelowSpent && (
            <Text style={{ color: '#ef4444', fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Cannot set budget below already spent amount ({spentNrt.toLocaleString()} NRT)</Text>
          )}

          {typeof budgetNrt === 'number' && budgetNrt !== initialBudget && !isBelowSpent && (
            <Text style={{ fontSize: 10, marginTop: 4, fontWeight: 'bold', color: additionalBudgetNeeded > 0 ? '#f59e0b' : '#10b981' }}>
              {additionalBudgetNeeded > 0 
                ? `⬆ ${additionalBudgetNeeded.toLocaleString()} NRT will be additionally escrowed`
                : `⬇ ${Math.abs(additionalBudgetNeeded).toLocaleString()} NRT will be refunded`
              }
            </Text>
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
            <Pressable onPress={() => setIsRecurring(!isRecurring)} style={[styles.recurringBtn, isRecurring && styles.recurringBtnActive]}>
              <RefreshCw size={12} color={isRecurring ? colors.accentPrimary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: isRecurring ? colors.accentPrimary : colors.textSecondary }}>Recurring</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2023-12-01" placeholderTextColor={colors.textSecondary} value={startDate} onChangeText={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2023-12-31" placeholderTextColor={colors.textSecondary} value={endDate} onChangeText={setEndDate} />
            </View>
          </View>
        </View>

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
                  onPress={() => { setNetworkId(n.id); setShowNetworkDropdown(false); }}
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
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentPrimary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  
  section: { marginBottom: 20 },
  card: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  
  label: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontSize: 14, marginBottom: 12 },
  
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  
  openMapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: colors.accentPrimary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  openMapBtnText: { color: colors.accentPrimary, fontWeight: '600', fontSize: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 12, color: colors.textPrimary, fontWeight: 'bold' },
  chipRadius: { fontSize: 11, color: colors.textSecondary },

  budgetInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16 },
  budgetCurrency: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, marginRight: 8 },
  budgetInput: { flex: 1, color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', paddingVertical: 12 },

  reachBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(167, 139, 250, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)', padding: 16, borderRadius: 12, marginTop: 12 },
  reachIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(167, 139, 250, 0.2)', alignItems: 'center', justifyContent: 'center' },

  recurringBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.bgPrimary },
  recurringBtnActive: { backgroundColor: 'rgba(167, 139, 250, 0.2)' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  serviceOption: { paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
});
