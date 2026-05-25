import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { ChevronLeft, Image as ImageIcon, Globe, Smartphone, Play, Gamepad2, Save, Copy } from 'lucide-react-native';
import { useSpStore } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';

const CATEGORIES = ['Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Other'];

export default function EditServiceScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { services, updateService, isLoading } = useSpStore();
  const { showToast } = useToastStore();

  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [webUrl, setWebUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  const [playstationUrl, setPlaystationUrl] = useState('');
  const [xboxUrl, setXboxUrl] = useState('');
  const [steamUrl, setSteamUrl] = useState('');
  const [oculusUrl, setOculusUrl] = useState('');
  const [nintendoUrl, setNintendoUrl] = useState('');

  useEffect(() => {
    const service = services.find(s => s.id === id);
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setCategory(service.category);
      setWebUrl(service.webUrl || '');
      setAndroidUrl(service.androidUrl || '');
      setIosUrl(service.iosUrl || '');
      setApiKey(service.apiKey || '');
      setPlaystationUrl(service.playstationUrl || '');
      setXboxUrl(service.xboxUrl || '');
      setSteamUrl(service.steamUrl || '');
      setOculusUrl(service.oculusUrl || '');
      setNintendoUrl(service.nintendoUrl || '');
    } else if (!isLoading) {
      showToast('Service not found', 'danger');
      router.back();
    }
  }, [id, services, isLoading, router, showToast]);

  const isGaming = category.toLowerCase() === 'gaming';

  const hasAnyPlatformUrl = webUrl.trim() || androidUrl.trim() || iosUrl.trim() ||
    (isGaming && (playstationUrl.trim() || xboxUrl.trim() || steamUrl.trim() || oculusUrl.trim() || nintendoUrl.trim()));
  const canContinue = name.trim().length > 0 && hasAnyPlatformUrl;

  const handleSave = async () => {
    if (!canContinue || !id) return;
    setIsSaving(true);
    
    try {
      await updateService(id as string, {
        name,
        description,
        category,
        webUrl,
        androidUrl,
        iosUrl,
        ...(isGaming && { playstationUrl, xboxUrl, steamUrl, oculusUrl, nintendoUrl }),
      });
      showToast('Service updated successfully', 'success');
      router.back();
    } catch (err: any) {
      showToast(err.message || 'Failed to update service', 'danger');
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
        <Text style={styles.headerTitle}>Edit Service</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={!canContinue || isSaving} 
          style={[styles.saveBtn, (!canContinue || isSaving) && { opacity: 0.5 }]}
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
          <Text style={styles.label}>Service Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Netflix, Spotify"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Briefly describe your service..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
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

        {apiKey ? (
          <View style={styles.apiKeyCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>API KEY</Text>
              <Copy size={16} color={colors.accentPrimary} />
            </View>
            <View style={styles.apiKeyValueBox}>
              <Text style={styles.apiKeyValue}>{apiKey}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Platform URLs</Text>
        
        <View style={styles.urlGroup}>
          <View style={styles.urlHeader}><Globe size={14} color={colors.accentPrimary} /><Text style={styles.urlLabel}>Web Platform</Text></View>
          <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={colors.textSecondary} value={webUrl} onChangeText={setWebUrl} keyboardType="url" autoCapitalize="none" />
        </View>

        <View style={styles.urlGroup}>
          <View style={styles.urlHeader}><Smartphone size={14} color="#3DDC84" /><Text style={styles.urlLabel}>Android Platform</Text></View>
          <TextInput style={styles.input} placeholder="Play Store URL" placeholderTextColor={colors.textSecondary} value={androidUrl} onChangeText={setAndroidUrl} keyboardType="url" autoCapitalize="none" />
        </View>

        <View style={styles.urlGroup}>
          <View style={styles.urlHeader}><Play size={14} color="#007AFF" /><Text style={styles.urlLabel}>iOS Platform</Text></View>
          <TextInput style={styles.input} placeholder="App Store URL" placeholderTextColor={colors.textSecondary} value={iosUrl} onChangeText={setIosUrl} keyboardType="url" autoCapitalize="none" />
        </View>

        {isGaming && (
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Gamepad2 size={16} color={colors.accentPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Console & Platform URLs</Text>
            </View>

            <View style={styles.urlGroup}>
              <Text style={styles.urlLabel}>PlayStation Store</Text>
              <TextInput style={[styles.input, { borderColor: '#003791' }]} placeholder="https://store.playstation.com/..." placeholderTextColor={colors.textSecondary} value={playstationUrl} onChangeText={setPlaystationUrl} keyboardType="url" autoCapitalize="none" />
            </View>

            <View style={styles.urlGroup}>
              <Text style={styles.urlLabel}>Xbox Store</Text>
              <TextInput style={[styles.input, { borderColor: '#107C10' }]} placeholder="https://www.xbox.com/games/..." placeholderTextColor={colors.textSecondary} value={xboxUrl} onChangeText={setXboxUrl} keyboardType="url" autoCapitalize="none" />
            </View>

            <View style={styles.urlGroup}>
              <Text style={styles.urlLabel}>Steam Store</Text>
              <TextInput style={[styles.input, { borderColor: '#1B2838' }]} placeholder="https://store.steampowered.com/app/..." placeholderTextColor={colors.textSecondary} value={steamUrl} onChangeText={setSteamUrl} keyboardType="url" autoCapitalize="none" />
            </View>
          </View>
        )}

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
  categoryChipActive: { backgroundColor: 'rgba(167, 139, 250, 0.1)', borderColor: colors.accentPrimary },
  categoryText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  categoryTextActive: { color: colors.accentPrimary },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  urlGroup: { marginBottom: 16 },
  urlHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  urlLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginLeft: 6 },
  
  apiKeyCard: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 20 },
  apiKeyValueBox: { backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  apiKeyValue: { color: colors.textPrimary, fontSize: 12, fontFamily: 'monospace' },
});
