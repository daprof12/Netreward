import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Image as ImageIcon, Globe, Smartphone, Play, ArrowRight, Loader2, CheckCircle2, Copy, Lock, ShieldCheck, Gamepad2 } from 'lucide-react-native';
import { useSpStore } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';
import { useFormStore } from '@/stores/useFormStore';

const CATEGORIES = ['Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Other'];

export default function CreateServiceScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { addService } = useSpStore();
  const { showToast } = useToastStore();
  
  const { drafts, updateServiceDraft, clearServiceDraft } = useFormStore();
  const draft = drafts.service;

  useEffect(() => {
    clearServiceDraft();
  }, [clearServiceDraft]);

  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');

  const name = draft.name;
  const description = draft.description;
  const category = draft.category;
  const webUrl = draft.webUrl;
  const androidUrl = draft.androidUrl;
  const iosUrl = draft.iosUrl;
  
  const playstationUrl = draft.playstationUrl || '';
  const xboxUrl = draft.xboxUrl || '';
  const steamUrl = draft.steamUrl || '';
  const oculusUrl = draft.oculusUrl || '';
  const nintendoUrl = draft.nintendoUrl || '';

  const isGaming = category.toLowerCase() === 'gaming';

  const [credentials, setCredentials] = useState<{apiKey: string} | null>(null);

  const hasAnyPlatformUrl = webUrl.trim() || androidUrl.trim() || iosUrl.trim() ||
    (isGaming && (playstationUrl.trim() || xboxUrl.trim() || steamUrl.trim() || oculusUrl.trim() || nintendoUrl.trim()));
  const canContinue = name.trim().length > 0 && hasAnyPlatformUrl;

  const handleContinue = () => {
    if (!canContinue) return;
    setStep('verifying');

    setTimeout(async () => {
      const generatedApiKey = 'nr_live_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      setCredentials({ apiKey: generatedApiKey });

      try {
        await addService({
          name,
          description,
          category,
          webUrl,
          androidUrl,
          iosUrl,
          apiKey: generatedApiKey,
          ...(isGaming && { playstationUrl, xboxUrl, steamUrl, oculusUrl, nintendoUrl }),
        });
        setStep('success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create service', 'danger');
        setStep('form');
      }
    }, 3000);
  };

  const handleFinish = () => {
    showToast('Service created successfully!', 'success');
    clearServiceDraft();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={step === 'verifying'} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Service</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'form' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.imageUpload}>
            <ImageIcon size={28} color={colors.textSecondary} />
            <Text style={styles.imageUploadText}>LOGO</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Service Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Netflix, Spotify"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(v) => updateServiceDraft({ name: v })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Briefly describe your service..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={(v) => updateServiceDraft({ description: v })}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map(cat => (
                <Pressable 
                  key={cat} 
                  onPress={() => updateServiceDraft({ category: cat })}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>Platform URLs</Text>
          
          <View style={styles.urlGroup}>
            <View style={styles.urlHeader}><Globe size={14} color={colors.accentPrimary} /><Text style={styles.urlLabel}>Web Platform</Text></View>
            <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={webUrl} onChangeText={(v) => updateServiceDraft({ webUrl: v })} keyboardType="url" autoCapitalize="none" />
          </View>

          <View style={styles.urlGroup}>
            <View style={styles.urlHeader}><Smartphone size={14} color="#3DDC84" /><Text style={styles.urlLabel}>Android Platform</Text></View>
            <TextInput style={styles.input} placeholder="Play Store URL" placeholderTextColor={colors.textSecondary} value={androidUrl} onChangeText={(v) => updateServiceDraft({ androidUrl: v })} keyboardType="url" autoCapitalize="none" />
          </View>

          <View style={styles.urlGroup}>
            <View style={styles.urlHeader}><Play size={14} color="#007AFF" /><Text style={styles.urlLabel}>iOS Platform</Text></View>
            <TextInput style={styles.input} placeholder="App Store URL" placeholderTextColor={colors.textSecondary} value={iosUrl} onChangeText={(v) => updateServiceDraft({ iosUrl: v })} keyboardType="url" autoCapitalize="none" />
          </View>

          {isGaming && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Gamepad2 size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Console & Platform URLs</Text>
              </View>

              <View style={styles.urlGroup}>
                <Text style={styles.urlLabel}>PlayStation Store</Text>
                <TextInput style={[styles.input, { borderColor: '#003791' }]} placeholder="https://store.playstation.com/..." placeholderTextColor={colors.textSecondary} value={playstationUrl} onChangeText={(v) => updateServiceDraft({ playstationUrl: v })} keyboardType="url" autoCapitalize="none" />
              </View>

              <View style={styles.urlGroup}>
                <Text style={styles.urlLabel}>Xbox Store</Text>
                <TextInput style={[styles.input, { borderColor: '#107C10' }]} placeholder="https://www.xbox.com/games/..." placeholderTextColor={colors.textSecondary} value={xboxUrl} onChangeText={(v) => updateServiceDraft({ xboxUrl: v })} keyboardType="url" autoCapitalize="none" />
              </View>

              <View style={styles.urlGroup}>
                <Text style={styles.urlLabel}>Steam Store</Text>
                <TextInput style={[styles.input, { borderColor: '#1B2838' }]} placeholder="https://store.steampowered.com/app/..." placeholderTextColor={colors.textSecondary} value={steamUrl} onChangeText={(v) => updateServiceDraft({ steamUrl: v })} keyboardType="url" autoCapitalize="none" />
              </View>
            </View>
          )}

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
          <Text style={styles.headerTitle}>Registering Service</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Setting up and generating API key...</Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.centerContainer}>
          <View style={styles.successIconBg}>
            <CheckCircle2 size={40} color="#10b981" />
          </View>
          <Text style={styles.headerTitle}>Registration Complete</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', marginBottom: 24 }}>Your service is active. Use the API key below to integrate.</Text>

          <View style={styles.apiKeyCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>API KEY</Text>
              <Copy size={16} color={colors.accentPrimary} />
            </View>
            <View style={styles.apiKeyValueBox}>
              <Text style={styles.apiKeyValue}>{credentials?.apiKey}</Text>
            </View>
          </View>

          <View style={styles.securityNote}>
            <ShieldCheck size={20} color={colors.accentPrimary} style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>Store this API key securely. It's used for both SDK integration and payments.</Text>
          </View>

          <Pressable onPress={handleFinish} style={[styles.continueBtn, { width: '100%', marginTop: 'auto' }]}>
            <Text style={styles.continueText}>Finish & Exit</Text>
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
  categoryChipActive: { backgroundColor: 'rgba(167, 139, 250, 0.1)', borderColor: colors.accentPrimary },
  categoryText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  categoryTextActive: { color: colors.accentPrimary },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  urlGroup: { marginBottom: 16 },
  urlHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  urlLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginLeft: 6 },

  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, paddingVertical: 16, borderRadius: 16, marginTop: 12 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },

  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  successIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 4, borderColor: 'rgba(16, 185, 129, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  
  apiKeyCard: { width: '100%', backgroundColor: colors.bgSecondary, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  apiKeyValueBox: { backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  apiKeyValue: { color: colors.textPrimary, fontSize: 12, fontFamily: 'monospace' },

  securityNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(167, 139, 250, 0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
});
