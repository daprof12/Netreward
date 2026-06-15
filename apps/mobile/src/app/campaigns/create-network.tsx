import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Image as ImageIcon, ArrowRight, Loader2, CheckCircle2, Copy, Network, Signal, AlertCircle, Key } from 'lucide-react-native';
import { useIspStore } from '@/stores/useIspStore';
import { useToastStore } from '@/stores/useToastStore';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const CATEGORIES = ['Telecommunication', 'Satellite', 'Fiber', 'Mobile Network', 'Broadband', 'Other'];

export default function CreateNetworkScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { addNetwork } = useIspStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [country, setCountry] = useState('');
  const [signalStrength, setSignalStrength] = useState(75);
  const [coverage, setCoverage] = useState('');
  const [asn, setAsn] = useState('');
  const [ipRanges, setIpRanges] = useState('');
  const [handshakeUrl, setHandshakeUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');

  const canContinue = name.trim().length >= 2 && country.trim().length > 0;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLogoPreview(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    setErrors({});
    setStep('verifying');

    setTimeout(async () => {
      const generatedApiKey = 'nrt_isp_' + Date.now().toString(36);
      setApiKey(generatedApiKey);

      try {
        await addNetwork({
          name,
          category,
          country,
          signalStrength,
          coverage,
          asn,
          ipRanges: ipRanges ? ipRanges.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
          handshakeUrl,
          webhookUrl,
          logoUrl: logoPreview || undefined,
          apiKey: generatedApiKey
        });
        setStep('success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create network', 'danger');
        setStep('form');
      }
    }, 3000);
  };

  const handleFinish = () => {
    showToast('Network connected!', 'success');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={step === 'verifying'} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Network</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'form' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          <Pressable onPress={pickImage} style={[styles.imageUpload, { overflow: 'hidden' }]}>
            {logoPreview ? (
              <Image source={{ uri: logoPreview }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <>
                <ImageIcon size={28} color={colors.textSecondary} />
                <Text style={styles.imageUploadText}>LOGO</Text>
              </>
            )}
          </Pressable>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Webhook URL</Text>
              <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={webhookUrl} onChangeText={setWebhookUrl} keyboardType="url" autoCapitalize="none" />
            </View>
          </View>

          <Pressable 
            onPress={handleContinue} 
            disabled={!canContinue}
            style={[styles.continueBtn, !canContinue && { opacity: 0.5 }]}
          >
            <Text style={styles.continueText}>Continue & Verify</Text>
            <ArrowRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      )}

      {step === 'verifying' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginBottom: 20 }} />
          <Text style={styles.headerTitle}>Verifying Network...</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Connecting to your network identity to establish the handshake API.</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centerContainer}>
          <View style={styles.successIconBg}>
            <CheckCircle2 size={40} color="#10b981" />
          </View>
          <Text style={styles.headerTitle}>Network Connected!</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
            Your network has been verified. Save your API credentials below.
          </Text>

          <View style={styles.apiKeyCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>API KEY</Text>
              <Copy size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.apiKeyValueBox}>
              <Text style={styles.apiKeyValue}>{apiKey}</Text>
            </View>
          </View>

          <Pressable onPress={handleFinish} style={[styles.continueBtn, { width: '100%', marginTop: 'auto' }]}>
            <Text style={styles.continueText}>Back to Dashboard</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  
  imageUpload: { alignSelf: 'center', width: 96, height: 96, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: colors.bgSecondary },
  imageUploadText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginTop: 4 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontSize: 14 },
  
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  categoryChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  categoryText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  categoryTextActive: { color: '#10b981' },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, paddingVertical: 16, borderRadius: 16, marginTop: 12 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },

  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 4, borderColor: 'rgba(16, 185, 129, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  
  apiKeyCard: { width: '100%', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  apiKeyValueBox: { backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  apiKeyValue: { color: colors.textPrimary, fontSize: 12, fontFamily: 'monospace' },
});
