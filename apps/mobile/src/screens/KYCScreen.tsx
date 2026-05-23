import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
type PageStep = 'status' | 'liveness' | 'documents';
type TargetRole = 'user' | 'sp' | 'isp';

interface DocItem {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  uri: string | null;
}

export default function KYCScreen({ targetRole = 'user' as TargetRole }) {
  const { profile } = useAuthStore();
  const [pageStep, setPageStep] = useState<PageStep>('status');
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessProgress, setLivenessProgress] = useState(0);

  const isBusinessRole = targetRole === 'sp' || targetRole === 'isp';
  const roleLabel = targetRole === 'sp' ? 'Service Provider' : targetRole === 'isp' ? 'Internet Service Provider' : 'Standard User';

  const [businessForm, setBusinessForm] = useState({
    businessName: '', website: '', businessEmail: '', phoneNumber: '', businessAddress: '',
  });

  const buildDocs = (): DocItem[] => {
    const docs: DocItem[] = [
      { id: 'id', name: 'Government Issued ID', desc: 'Passport, Driver License, or National ID', emoji: '📄', uri: null },
    ];
    if (isBusinessRole) {
      docs.push({ id: 'biz', name: 'Business Registration', desc: 'Corporate Documents', emoji: '🏢', uri: null });
      docs.push({ id: 'logo', name: 'Company Logo', desc: 'High-resolution brand logo', emoji: '🖼️', uri: null });
    }
    if (targetRole === 'isp') {
      docs.push({ id: 'lic', name: 'ISP License', desc: 'Telecom Authority License', emoji: '🏛️', uri: null });
    }
    return docs;
  };

  const [documents, setDocuments] = useState<DocItem[]>(buildDocs());

  useEffect(() => {
    fetchSubmission();
  }, [profile?.id]);

  const fetchSubmission = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('kyc_submissions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('target_role', targetRole)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExistingSubmission(data);
    } catch (e) {}
    setLoading(false);
  };

  const LIVENESS_STEPS = [
    { emoji: '↩️', label: 'Turn Head Left', desc: 'Slowly turn your head to the left' },
    { emoji: '😮', label: 'Open Mouth', desc: 'Open your mouth wide and hold' },
    { emoji: '🔄', label: 'Rotate Head', desc: 'Slowly rotate your head in a circle' },
    { emoji: '✅', label: 'Complete', desc: 'Liveness check complete!' },
  ];

  const startLiveness = () => {
    let step = 0;
    setLivenessStep(0);
    setLivenessProgress(0);

    const runStep = () => {
      if (step >= LIVENESS_STEPS.length - 1) {
        setLivenessStep(LIVENESS_STEPS.length - 1);
        setLivenessProgress(100);
        return;
      }
      setLivenessStep(step);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setLivenessProgress(Math.min(progress, 100));
        if (progress >= 100) {
          clearInterval(interval);
          step++;
          setTimeout(runStep, 300);
        }
      }, 80);
    };
    runStep();
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for the selfie check');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const pickDocument = async (docId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, uri: result.assets[0].uri } : d));
    }
  };

  const allDocsUploaded = documents.every(d => d.uri !== null);
  const isFormValid = isBusinessRole
    ? allDocsUploaded && Object.values(businessForm).every(v => v.trim() !== '') && selfieUri
    : allDocsUploaded && selfieUri;

  const handleSubmit = async () => {
    if (!isFormValid || !profile?.id) return;
    setSubmitting(true);
    try {
      // Upload selfie
      const selfieExt = 'jpg';
      const selfiePath = `${profile.id}/selfie_${Date.now()}.${selfieExt}`;
      const selfieBlob = await fetch(selfieUri!).then(r => r.blob());
      await supabase.storage.from('kyc-documents').upload(selfiePath, selfieBlob, { contentType: 'image/jpeg', upsert: true });
      const { data: selfieUrlData } = supabase.storage.from('kyc-documents').getPublicUrl(selfiePath);

      // Upload each document
      const docUrls: Record<string, string> = {};
      for (const doc of documents) {
        if (!doc.uri) continue;
        const path = `${profile.id}/${doc.id}_${Date.now()}.jpg`;
        const blob = await fetch(doc.uri).then(r => r.blob());
        await supabase.storage.from('kyc-documents').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);
        docUrls[doc.id] = urlData.publicUrl;
      }

      const { error } = await supabase.from('kyc_submissions').insert({
        user_id: profile.id,
        target_role: targetRole,
        selfie_url: selfieUrlData.publicUrl,
        id_doc_type: 'government_id',
        id_doc_url: docUrls['id'] || '',
        ...(isBusinessRole ? {
          business_name: businessForm.businessName,
          website: businessForm.website,
          business_email: businessForm.businessEmail,
          phone_number: businessForm.phoneNumber,
          business_address: businessForm.businessAddress,
          biz_reg_url: docUrls['biz'] || '',
          logo_url: docUrls['logo'] || '',
        } : {}),
        ...(targetRole === 'isp' ? { isp_license_url: docUrls['lic'] || '' } : {}),
        status: 'pending',
      });

      if (error) throw error;
      await supabase.from('users').update({ kyc_status: 'pending' }).eq('id', profile.id);
      Alert.alert('Success', 'KYC submitted! Pending admin review.');
      setExistingSubmission({ status: 'pending', target_role: targetRole, created_at: new Date().toISOString() });
      setPageStep('status');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit KYC');
    }
    setSubmitting(false);
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.accentPrimary} /></View>;

  // ── STATUS VIEW ──
  if (pageStep === 'status') {
    const status = existingSubmission?.status || 'none';
    const statusConfig: Record<string, { emoji: string; title: string; desc: string; color: string }> = {
      verified: { emoji: '✅', title: 'Account Verified', desc: `Your ${roleLabel} KYC has been approved. Full access unlocked.`, color: '#10b981' },
      pending: { emoji: '⏳', title: 'Under Review', desc: 'Your documents are being reviewed. This typically takes 1-2 business days.', color: '#3b82f6' },
      rejected: { emoji: '❌', title: 'Verification Rejected', desc: existingSubmission?.admin_note ? `Reason: "${existingSubmission.admin_note}"` : 'Please resubmit with correct documents.', color: '#ef4444' },
      none: { emoji: '🛡️', title: `Verify as ${roleLabel}`, desc: `Submit documents to verify your ${roleLabel} account and unlock all features.`, color: '#f59e0b' },
    };
    const cfg = statusConfig[status];

    return (
      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <View style={[s.statusIcon, { borderColor: cfg.color + '33' }]}>
          <Text style={{ fontSize: 40 }}>{cfg.emoji}</Text>
        </View>
        <Text style={s.statusTitle}>{cfg.title}</Text>
        <Text style={s.statusDesc}>{cfg.desc}</Text>

        {/* Privileges */}
        <View style={[s.card, { marginTop: 24 }]}>
          <Text style={s.cardTitle}>{existingSubmission ? 'Privileges Unlocked' : "What you'll unlock"}</Text>
          {[
            targetRole === 'user' ? 'Verified account badge' : `${roleLabel} dashboard access`,
            targetRole === 'user' ? 'Higher withdrawal limits' : 'SDK integration & API key',
            targetRole === 'user' ? 'Full P2P trading access' : 'Campaign creation & management',
            targetRole !== 'user' ? `Admin-tracked ${targetRole === 'sp' ? '10%' : '5%'} NRT cashback` : 'NRT reward multiplier bonus',
          ].map((item, i) => (
            <View key={i} style={s.privilegeRow}>
              <Text style={{ color: colors.accentPrimary, fontSize: 13 }}>✓</Text>
              <Text style={s.privilegeText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Action */}
        {status !== 'pending' && status !== 'verified' && (
          <Pressable style={s.primaryButton} onPress={() => { setPageStep('liveness'); }}>
            <Text style={s.primaryButtonText}>{status === 'rejected' ? 'Resubmit KYC' : 'Start Verification'}</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  // ── LIVENESS CHECK ──
  if (pageStep === 'liveness') {
    const currentStep = LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)];
    const isDone = livenessStep >= LIVENESS_STEPS.length - 1;

    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.content, { alignItems: 'center' }]}>
        <Text style={s.sectionTitle}>Liveness Check</Text>
        <Text style={s.sectionDesc}>Follow the instructions to confirm you're a real person</Text>

        {/* Face Frame */}
        <View style={s.faceFrame}>
          {selfieUri ? (
            <Image source={{ uri: selfieUri }} style={s.faceImage} />
          ) : (
            <Text style={{ fontSize: 48, color: colors.textTertiary }}>📸</Text>
          )}
          <View style={[s.faceRing, { borderColor: isDone ? '#10b981' : colors.accentPrimary }]} />
        </View>

        {/* Step Instruction */}
        <View style={s.card}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{currentStep.emoji}</Text>
          <Text style={[s.cardTitle, { textAlign: 'center' }]}>{currentStep.label}</Text>
          <Text style={[s.sectionDesc, { textAlign: 'center' }]}>{currentStep.desc}</Text>
          <View style={s.stepDots}>
            {LIVENESS_STEPS.slice(0, -1).map((_, i) => (
              <View key={i} style={[s.dot, i < livenessStep ? s.dotDone : i === livenessStep ? s.dotActive : {}]} />
            ))}
          </View>
        </View>

        {isDone ? (
          <>
            {!selfieUri && (
              <Pressable style={[s.primaryButton, { backgroundColor: '#10b981' }]} onPress={takeSelfie}>
                <Text style={s.primaryButtonText}>📷 Take Selfie</Text>
              </Pressable>
            )}
            <Pressable style={[s.primaryButton, !selfieUri && { opacity: 0.4 }]} disabled={!selfieUri} onPress={() => setPageStep('documents')}>
              <Text style={s.primaryButtonText}>Continue to Documents →</Text>
            </Pressable>
          </>
        ) : livenessStep === 0 && livenessProgress === 0 ? (
          <Pressable style={s.primaryButton} onPress={startLiveness}>
            <Text style={s.primaryButtonText}>Start Check</Text>
          </Pressable>
        ) : (
          <View style={[s.primaryButton, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[s.primaryButtonText, { color: colors.textSecondary }]}>Follow the instructions above…</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── DOCUMENT UPLOAD ──
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* Success Banner */}
      <View style={s.successBanner}>
        <Text style={s.successText}>✅ Liveness check passed. Please upload your documents.</Text>
      </View>

      {/* Business Form */}
      {isBusinessRole && (
        <View style={{ gap: 12 }}>
          <Text style={s.sectionTitle}>Business Information</Text>
          {[
            { key: 'businessName', label: targetRole === 'sp' ? 'SP Name' : 'ISP Name', placeholder: 'e.g. Acme Network' },
            { key: 'website', label: 'Website URL', placeholder: 'https://acme.com' },
            { key: 'businessEmail', label: 'Business Email', placeholder: 'contact@acme.com' },
            { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1 234 567 8900' },
          ].map(field => (
            <View key={field.key}>
              <Text style={s.inputLabel}>{field.label} *</Text>
              <TextInput
                style={s.input}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={businessForm[field.key as keyof typeof businessForm]}
                onChangeText={v => setBusinessForm({ ...businessForm, [field.key]: v })}
              />
            </View>
          ))}
          <View>
            <Text style={s.inputLabel}>Business Address *</Text>
            <TextInput
              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="123 Corporate Blvd, Tech City"
              placeholderTextColor={colors.textTertiary}
              value={businessForm.businessAddress}
              onChangeText={v => setBusinessForm({ ...businessForm, businessAddress: v })}
              multiline
            />
          </View>
        </View>
      )}

      {/* Document List */}
      <Text style={[s.sectionTitle, { marginTop: 20 }]}>Required Documents</Text>
      <View style={s.docList}>
        {documents.map(doc => (
          <Pressable key={doc.id} style={s.docRow} onPress={() => !doc.uri && pickDocument(doc.id)}>
            <View style={s.docIcon}>
              <Text style={{ fontSize: 20 }}>{doc.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.docName}>{doc.name}</Text>
              <Text style={s.docDesc}>{doc.desc}</Text>
            </View>
            {doc.uri ? (
              <View style={s.uploadedBadge}>
                <Text style={s.uploadedBadgeText}>✓ UPLOADED</Text>
              </View>
            ) : (
              <Pressable style={s.uploadButton} onPress={() => pickDocument(doc.id)}>
                <Text style={s.uploadButtonText}>Upload</Text>
              </Pressable>
            )}
          </Pressable>
        ))}
      </View>

      {/* Submit */}
      <Pressable
        style={[s.primaryButton, (!isFormValid || submitting) && { opacity: 0.4 }]}
        disabled={!isFormValid || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.primaryButtonText}>Submit for Review</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },

  statusIcon: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 32, marginBottom: 16 },
  statusTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' },
  statusDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },

  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  privilegeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privilegeText: { fontSize: 13, color: colors.textSecondary },

  primaryButton: { backgroundColor: colors.accentPrimary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16, ...shadows.accent },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  faceFrame: { width: 200, height: 240, alignItems: 'center', justifyContent: 'center', marginVertical: 24, position: 'relative' },
  faceImage: { width: 180, height: 220, borderRadius: 110, objectFit: 'cover' },
  faceRing: { position: 'absolute', width: 196, height: 236, borderRadius: 120, borderWidth: 3 },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgSecondary },
  dotDone: { backgroundColor: colors.accentPrimary },
  dotActive: { backgroundColor: colors.accentPrimary, opacity: 0.5 },

  successBanner: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 12, padding: 12, marginBottom: 16 },
  successText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  inputLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, fontSize: 13, color: colors.textPrimary },

  docList: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, overflow: 'hidden' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  docDesc: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  uploadedBadge: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  uploadedBadgeText: { fontSize: 9, fontWeight: '900', color: '#10b981' },
  uploadButton: { backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uploadButtonText: { fontSize: 11, fontWeight: '800', color: colors.accentPrimary },
});
