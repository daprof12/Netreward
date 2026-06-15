import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Animated, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ChevronLeft, ShieldAlert, CheckCircle2, XCircle, FileText, Building,
  Server, UploadCloud, Eye, X, Image as ImageIcon, Camera, RotateCcw,
  AlertCircle, Clock, User as UserIcon
} from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { getRoleKycStatus } from '@/lib/kycUtils';

type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
type TargetRole = 'user' | 'sp' | 'isp';

const LIVENESS_STEPS = [
  { key: 'turn_head', label: 'Turn Head Left', instruction: 'Slowly turn your head to the left', emoji: '↩️' },
  { key: 'open_mouth', label: 'Open Mouth', instruction: 'Open your mouth wide and hold', emoji: '😮' },
  { key: 'rotate_head', label: 'Rotate Head', instruction: 'Slowly rotate your head in a circle', emoji: '🔄' },
  { key: 'done', label: 'Complete', instruction: 'Liveness check complete!', emoji: '✅' },
];

export default function KycScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetRole = (params.targetRole as TargetRole) || 'user';
  const isBusinessRole = targetRole === 'sp' || targetRole === 'isp';

  const { user, profile } = useAuthStore();
  const { showToast } = useToastStore();

  const [pageStep, setPageStep] = useState<'status' | 'liveness' | 'documents'>('status');
  
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Liveness
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Business Form
  const [businessForm, setBusinessForm] = useState({
    businessName: '', website: '', businessEmail: '', phoneNumber: '', businessAddress: ''
  });

  useEffect(() => {
    async function fetchSubmission() {
      if (!user?.id) return;
      setIsFetching(true);
      try {
        const { data } = await supabase
          .from('kyc_submissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('target_role', targetRole)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setExistingSubmission(data);
          if (data.business_name) {
            setBusinessForm({
              businessName: data.business_name || '',
              website: data.website || '',
              businessEmail: data.business_email || '',
              phoneNumber: data.phone_number || '',
              businessAddress: data.business_address || '',
            });
          }
          if (data.selfie_url) setSelfieUrl(data.selfie_url);
        }
      } catch (e) {
      } finally {
        setIsFetching(false);
      }
    }
    fetchSubmission();
  }, [user?.id, targetRole]);

  useEffect(() => {
    const docs = [
      { id: 'id', name: 'Government Issued ID', desc: 'Passport, Driver License, or National ID', icon: FileText, url: null },
    ];
    if (isBusinessRole) {
      docs.push({ id: 'biz', name: 'Business Registration', desc: 'Corporate Documents', icon: Building, url: null });
      docs.push({ id: 'logo', name: 'Company Logo', desc: 'High-resolution brand logo', icon: ImageIcon, url: null });
    }
    if (targetRole === 'isp') {
      docs.push({ id: 'lic', name: 'ISP License', desc: 'Telecom Authority License', icon: Server, url: null });
    }
    setDocuments(docs);
  }, [targetRole, isBusinessRole]);

  const startLivenessStep = (stepIndex: number) => {
    if (stepIndex >= LIVENESS_STEPS.length - 1) {
      setSelfieUrl('https://i.pravatar.cc/300'); // Mock selfie
      setLivenessStep(LIVENESS_STEPS.length - 1);
      setLivenessProgress(100);
      return;
    }
    setLivenessStep(stepIndex);
    setLivenessProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setLivenessProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => startLivenessStep(stepIndex + 1), 400);
      }
    }, 100);
  };

  const handleFileUpload = (docId: string) => {
    setUploadingDocId(docId);
    setTimeout(() => {
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, url: 'https://placeholder.com/doc.png' } : d));
      showToast('Document uploaded successfully', 'success');
      setUploadingDocId(null);
    }, 1500);
  };

  const allDocsUploaded = documents.every(d => d.url !== null);
  const isFormValid = isBusinessRole
    ? allDocsUploaded && Object.values(businessForm).every(v => v.trim() !== '') && selfieUrl
    : allDocsUploaded && selfieUrl;

  const handleSubmit = async () => {
    if (!isFormValid || !user?.id) return;
    setIsSubmitting(true);
    try {
      const idDoc = documents.find(d => d.id === 'id')?.url || '';
      const bizDoc = documents.find(d => d.id === 'biz')?.url || '';
      const logoDoc = documents.find(d => d.id === 'logo')?.url || '';
      const licDoc = documents.find(d => d.id === 'lic')?.url || '';

      const { error } = await supabase.from('kyc_submissions').insert({
        user_id: user.id,
        target_role: targetRole,
        selfie_url: selfieUrl,
        id_doc_type: 'government_id',
        id_doc_url: idDoc,
        ...(isBusinessRole ? {
          business_name: businessForm.businessName,
          website: businessForm.website,
          business_email: businessForm.businessEmail,
          phone_number: businessForm.phoneNumber,
          business_address: businessForm.businessAddress,
          biz_reg_url: bizDoc,
          logo_url: logoDoc,
        } : {}),
        ...(targetRole === 'isp' ? { isp_license_url: licDoc } : {}),
        status: 'pending',
      });

      if (error) throw error;

      const updateData: Record<string, string> = {};
      if (targetRole === 'sp') updateData.kyc_sp_status = 'pending';
      else if (targetRole === 'isp') updateData.kyc_isp_status = 'pending';
      else updateData.kyc_user_status = 'pending';

      await supabase.from('users').update(updateData).eq('id', user.id);
      
      showToast('KYC submitted successfully!', 'success');
      setExistingSubmission({ status: 'pending', target_role: targetRole, created_at: new Date().toISOString() });
      setPageStep('status');
    } catch (e: any) {
      showToast(e.message || 'Submission failed', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = targetRole === 'sp' ? 'Service Provider' : targetRole === 'isp' ? 'Internet Service Provider' : 'Standard User';

  if (isFetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => pageStep !== 'status' ? setPageStep('status') : router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pageStep === 'status' && (
          <View style={styles.statusView}>
            <View style={styles.statusIconContainer}>
              {getRoleKycStatus(profile, targetRole) === 'verified' || existingSubmission?.status === 'verified' ? (
                <View style={[styles.iconCircle, { borderColor: 'rgba(34, 197, 94, 0.2)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <CheckCircle2 size={40} color="#22c55e" />
                </View>
              ) : getRoleKycStatus(profile, targetRole) === 'pending' || existingSubmission?.status === 'pending' ? (
                <View style={[styles.iconCircle, { borderColor: 'rgba(59, 130, 246, 0.2)', backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Clock size={40} color="#3b82f6" />
                </View>
              ) : getRoleKycStatus(profile, targetRole) === 'rejected' || existingSubmission?.status === 'rejected' ? (
                <View style={[styles.iconCircle, { borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <XCircle size={40} color="#ef4444" />
                </View>
              ) : (
                <View style={[styles.iconCircle, { borderColor: 'rgba(249, 115, 22, 0.2)', backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                  <ShieldAlert size={40} color="#f97316" />
                </View>
              )}
              
              <Text style={styles.statusTitle}>
                {getRoleKycStatus(profile, targetRole) === 'verified' || existingSubmission?.status === 'verified'
                  ? 'Account Verified'
                  : getRoleKycStatus(profile, targetRole) === 'pending' || existingSubmission?.status === 'pending'
                  ? 'Under Review'
                  : getRoleKycStatus(profile, targetRole) === 'rejected' || existingSubmission?.status === 'rejected'
                  ? 'Verification Rejected'
                  : `Verify as ${roleLabel}`}
              </Text>
              
              <Text style={styles.statusDesc}>
                {getRoleKycStatus(profile, targetRole) === 'verified' || existingSubmission?.status === 'verified'
                  ? `Your ${roleLabel} KYC has been approved. You have full access.`
                  : getRoleKycStatus(profile, targetRole) === 'pending' || existingSubmission?.status === 'pending'
                  ? 'Your documents are being reviewed. This typically takes 1-2 business days.'
                  : getRoleKycStatus(profile, targetRole) === 'rejected' || existingSubmission?.status === 'rejected'
                  ? `Your submission was rejected. Please resubmit.`
                  : `Submit your documents to verify your ${roleLabel} account.`}
              </Text>
            </View>

            {existingSubmission && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <FileText size={16} color={colors.accentPrimary} />
                  <Text style={styles.cardTitle}>Submitted Information</Text>
                </View>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>SUBMITTED ON</Text>
                    <Text style={styles.value}>{new Date(existingSubmission.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>TARGET ROLE</Text>
                    <Text style={styles.value}>{existingSubmission.target_role?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            )}

            {!existingSubmission && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>What you'll unlock</Text>
                {[
                  targetRole === 'user' ? 'Verified account badge' : `${roleLabel} dashboard access`,
                  targetRole === 'user' ? 'Higher withdrawal limits' : 'SDK integration & API key',
                  targetRole === 'user' ? 'Full P2P trading access' : 'Campaign creation & management',
                ].map((item, i) => (
                  <View key={i} style={styles.unlockItem}>
                    <CheckCircle2 size={16} color={colors.accentPrimary} />
                    <Text style={styles.unlockText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {(getRoleKycStatus(profile, targetRole) === 'pending' || existingSubmission?.status === 'pending' || getRoleKycStatus(profile, targetRole) === 'verified' || existingSubmission?.status === 'verified') ? (
              <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
                <UserIcon size={18} color={colors.textPrimary} />
                <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => setPageStep('liveness')}>
                <Text style={styles.primaryBtnText}>
                  {getRoleKycStatus(profile, targetRole) === 'rejected' || existingSubmission?.status === 'rejected' ? 'Resubmit KYC Documents' : 'Start Verification'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {pageStep === 'liveness' && (
          <View style={styles.livenessView}>
            <Text style={styles.livenessTitle}>Liveness Check</Text>
            <Text style={styles.livenessDesc}>Follow the instructions to confirm you're a real person.</Text>

            <View style={styles.cameraFrame}>
              <View style={[styles.cameraRing, livenessStep === LIVENESS_STEPS.length - 1 && { borderColor: '#22c55e' }]} />
              <View style={styles.cameraPlaceholder}>
                <Camera size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
              </View>
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.emojiText}>{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].emoji}</Text>
              <Text style={styles.instructionTitle}>{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].label}</Text>
              <Text style={styles.instructionBody}>{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].instruction}</Text>
              
              <View style={styles.dots}>
                {LIVENESS_STEPS.slice(0, -1).map((_, i) => (
                  <View key={i} style={[styles.dot, i <= livenessStep && styles.dotActive]} />
                ))}
              </View>
            </View>

            {livenessStep === LIVENESS_STEPS.length - 1 ? (
              <Pressable style={[styles.primaryBtn, { backgroundColor: '#22c55e' }]} onPress={() => setPageStep('documents')}>
                <CheckCircle2 size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Continue to Documents</Text>
              </Pressable>
            ) : livenessStep === 0 && livenessProgress === 0 ? (
              <Pressable style={styles.primaryBtn} onPress={() => startLivenessStep(0)}>
                <Text style={styles.primaryBtnText}>Start Check (Mock)</Text>
              </Pressable>
            ) : (
              <View style={styles.loadingBtn}>
                <Text style={styles.loadingBtnText}>Follow the instructions above...</Text>
              </View>
            )}
          </View>
        )}

        {pageStep === 'documents' && (
          <View style={styles.documentsView}>
            
            {isBusinessRole && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Business Information</Text>
                
                <Text style={styles.inputLabel}>{targetRole === 'sp' ? 'SP Name' : 'ISP Name'} *</Text>
                <TextInput style={styles.input} value={businessForm.businessName} onChangeText={t => setBusinessForm({...businessForm, businessName: t})} placeholder="Acme Corp" placeholderTextColor="#666" />
                
                <Text style={styles.inputLabel}>Website URL *</Text>
                <TextInput style={styles.input} value={businessForm.website} onChangeText={t => setBusinessForm({...businessForm, website: t})} placeholder="https://acme.com" placeholderTextColor="#666" />
                
                <Text style={styles.inputLabel}>Business Email *</Text>
                <TextInput style={styles.input} value={businessForm.businessEmail} onChangeText={t => setBusinessForm({...businessForm, businessEmail: t})} placeholder="contact@acme.com" placeholderTextColor="#666" />
                
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput style={styles.input} value={businessForm.phoneNumber} onChangeText={t => setBusinessForm({...businessForm, phoneNumber: t})} placeholder="+1 234 567 8900" placeholderTextColor="#666" />
                
                <Text style={styles.inputLabel}>Business Address *</Text>
                <TextInput style={styles.input} value={businessForm.businessAddress} onChangeText={t => setBusinessForm({...businessForm, businessAddress: t})} placeholder="123 Corporate Blvd" placeholderTextColor="#666" />
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Required Documents</Text>
              
              {documents.map(doc => {
                const Icon = doc.icon;
                const isUploading = uploadingDocId === doc.id;
                
                return (
                  <View key={doc.id} style={styles.docRow}>
                    <View style={styles.docIconContainer}>
                      <Icon size={20} color={colors.accentPrimary} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName}>{doc.name}</Text>
                      <Text style={styles.docDesc}>{doc.desc}</Text>
                    </View>
                    {!doc.url ? (
                      <Pressable style={styles.uploadBtn} onPress={() => handleFileUpload(doc.id)} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator size="small" color={colors.accentPrimary} /> : <UploadCloud size={14} color={colors.accentPrimary} />}
                        <Text style={styles.uploadBtnText}>{isUploading ? 'Uploading...' : 'Upload'}</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.uploadedBadge}>
                        <Text style={styles.uploadedBadgeText}>UPLOADED</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Pressable 
              style={[styles.primaryBtn, (!isFormValid || isSubmitting) && { opacity: 0.5 }]} 
              disabled={!isFormValid || isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.primaryBtnText}>{isSubmitting ? 'Submitting...' : 'Submit for Review'}</Text>
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
  
  statusView: { alignItems: 'center' },
  statusIconContainer: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  statusDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300, lineHeight: 22 },

  card: { width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },
  label: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary },
  
  unlockItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  unlockText: { fontSize: 14, color: colors.textSecondary },

  primaryBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, marginTop: 16, width: '100%', borderWidth: 1, borderColor: colors.glassBorder },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },

  livenessView: { alignItems: 'center', paddingTop: 16 },
  livenessTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  livenessDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  cameraFrame: { width: 200, height: 260, position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  cameraRing: { position: 'absolute', width: '100%', height: '100%', borderRadius: 100, borderWidth: 4, borderColor: colors.accentPrimary },
  cameraPlaceholder: { width: 180, height: 240, borderRadius: 100, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  instructionCard: { width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  emojiText: { fontSize: 40, marginBottom: 12 },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  instructionBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgPrimary },
  dotActive: { backgroundColor: colors.accentPrimary },
  loadingBtn: { width: '100%', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  loadingBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold' },

  documentsView: { width: '100%' },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 12, color: colors.textPrimary, fontSize: 14 },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  docIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  docDesc: { fontSize: 12, color: colors.textSecondary },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  uploadBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  uploadedBadge: { backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  uploadedBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#22c55e' },
});
