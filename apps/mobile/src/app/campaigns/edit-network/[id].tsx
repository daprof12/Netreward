import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Image as ImageIcon, Save, Copy, Network, Signal, AlertCircle, Key } from 'lucide-react-native';
import { useIspStore } from '@/stores/useIspStore';
import { useToastStore } from '@/stores/useToastStore';
import Slider from '@react-native-community/slider';

const CATEGORIES = ['Telecommunication', 'Satellite', 'Fiber', 'Mobile Network', 'Broadband', 'Other'];

export default function EditNetworkScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { networks, updateNetwork, isLoading } = useIspStore();
  const { showToast } = useToastStore();

  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [country, setCountry] = useState('');
  const [signalStrength, setSignalStrength] = useState(75);
  const [coverage, setCoverage] = useState('');
  const [asn, setAsn] = useState('');
  const [ipRanges, setIpRanges] = useState('');
  const [handshakeUrl, setHandshakeUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const canSave = name.trim().length >= 2 && country.trim().length > 0;

  useEffect(() => {
    const network = networks.find(n => n.id === id);
    if (network) {
      setName(network.name);
      setCategory(network.category);
      setCountry(network.country || '');
      setSignalStrength(network.signalStrength || 75);
      setCoverage(network.coverage || '');
      setAsn(network.asn || '');
      setIpRanges(network.ipRanges ? network.ipRanges.join('\n') : '');
      setHandshakeUrl(network.handshakeUrl || '');
      setApiKey(network.apiKey || '');
    } else if (!isLoading) {
      showToast('Network not found', 'danger');
      router.back();
    }
  }, [id, networks, isLoading, router, showToast]);

  const handleSave = async () => {
    if (!canSave || !id) return;
    setIsSaving(true);
    setErrors({});

    try {
      await updateNetwork(id as string, {
        name,
        category,
        country,
        signalStrength,
        coverage,
        asn,
        ipRanges: ipRanges ? ipRanges.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
        handshakeUrl
      });
      showToast('Network updated successfully', 'success');
      router.back();
    } catch (err: any) {
      showToast(err.message || 'Failed to update network', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Network</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={!canSave || isSaving} 
          style={[styles.saveBtn, (!canSave || isSaving) && { opacity: 0.5 }]}
        >
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.imageUpload}>
          <ImageIcon size={28} color={colors.textSecondary} />
          <Text style={styles.imageUploadText}>LOGO</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Network Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. T-Mobile, Starlink..."
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(cat => (
              <Pressable 
                key={cat} 
                onPress={() => setCategory(cat)}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Country or Region..."
            placeholderTextColor={colors.textSecondary}
            value={country}
            onChangeText={setCountry}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Signal Strength ({Math.round(signalStrength)}%)</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            value={signalStrength}
            onValueChange={setSignalStrength}
            minimumTrackTintColor={signalStrength >= 75 ? '#10b981' : signalStrength >= 40 ? '#f59e0b' : '#ef4444'}
            maximumTrackTintColor={colors.glassBorder}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Coverage Regions</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. North America, Europe"
            placeholderTextColor={colors.textSecondary}
            value={coverage}
            onChangeText={setCoverage}
          />
        </View>

        {apiKey ? (
          <View style={{ marginTop: 16, marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Network Credentials</Text>
            <View style={styles.apiKeyCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.label}>API KEY</Text>
                <Copy size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.apiKeyValueBox}>
                <Text style={styles.apiKeyValue}>{apiKey}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Network size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase' }}>Technical Configuration</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ASN</Text>
            <TextInput style={styles.input} placeholder="e.g. AS6453" placeholderTextColor={colors.textSecondary} value={asn} onChangeText={setAsn} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>IP Ranges (One per line)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', fontFamily: 'monospace' }]} placeholder="197.210.0.0/16" placeholderTextColor={colors.textSecondary} value={ipRanges} onChangeText={setIpRanges} multiline />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Handshake URL</Text>
            <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={handshakeUrl} onChangeText={setHandshakeUrl} keyboardType="url" autoCapitalize="none" />
          </View>
        </View>

      </ScrollView>
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
  
  imageUpload: { alignSelf: 'center', width: 96, height: 96, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: colors.bgSecondary },
  imageUploadText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginTop: 4 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontSize: 14 },
  
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  categoryChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  categoryText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  categoryTextActive: { color: '#10b981' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  
  apiKeyCard: { width: '100%', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  apiKeyValueBox: { backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  apiKeyValue: { color: colors.textPrimary, fontSize: 12, fontFamily: 'monospace' },
});
