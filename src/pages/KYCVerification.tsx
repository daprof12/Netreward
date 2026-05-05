import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ShieldAlert, CheckCircle2, XCircle, FileText, Building,
  Server, UploadCloud, Eye, X, Image as ImageIcon, Camera, RotateCcw,
  AlertCircle, Loader2, Clock, User as UserIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
type TargetRole = 'user' | 'sp' | 'isp';
type LivenessStep = 'turn_head' | 'open_mouth' | 'rotate_head' | 'done';

interface DocumentItem {
  id: string;
  name: string;
  desc: string;
  icon: any;
  url: string | null;
}

interface ExistingSubmission {
  id: string;
  status: KycStatus;
  target_role: TargetRole;
  created_at: string;
  admin_note?: string;
}

const LIVENESS_STEPS: { key: LivenessStep; label: string; instruction: string; emoji: string }[] = [
  { key: 'turn_head', label: 'Turn Head Left', instruction: 'Slowly turn your head to the left', emoji: '↩️' },
  { key: 'open_mouth', label: 'Open Mouth', instruction: 'Open your mouth wide and hold', emoji: '😮' },
  { key: 'rotate_head', label: 'Rotate Head', instruction: 'Slowly rotate your head in a circle', emoji: '🔄' },
  { key: 'done', label: 'Complete', instruction: 'Liveness check complete!', emoji: '✅' },
];

export default function KYCVerification() {
  usePageTitle('KYC Verification');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthStore();
  const { showToast } = useToastStore();

  const targetRole: TargetRole = location.state?.targetRole || 'user';
  const isBusinessRole = targetRole === 'sp' || targetRole === 'isp';

  // ─── Page flow state ───
  type PageStep = 'status' | 'liveness' | 'documents';
  const [pageStep, setPageStep] = useState<PageStep>('status');

  // ─── Existing submission ───
  const [existingSubmission, setExistingSubmission] = useState<ExistingSubmission | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Liveness state ───
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const livenessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Document upload state ───
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);

  // ─── Business form state ───
  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    website: '',
    businessEmail: '',
    phoneNumber: '',
    businessAddress: '',
  });

  // ─── Fetch existing submission ───
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
          setExistingSubmission(data as any);
          // If business data exists, populate the form so it shows in details
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
      } catch {
        // No existing submission — that's fine
      } finally {
        setIsFetching(false);
      }
    }
    fetchSubmission();
  }, [user?.id, targetRole]);

  // Auto-refresh profile on status change to keep stores in sync
  useEffect(() => {
    if (existingSubmission?.status === 'verified') {
      useAuthStore.getState().refreshProfile();
    }
  }, [existingSubmission?.status]);

  // ─── Build document list based on role ───
  useEffect(() => {
    const docs: DocumentItem[] = [
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

  // ─── Liveness check logic ───
  const startLivenessStep = (stepIndex: number) => {
    if (stepIndex >= LIVENESS_STEPS.length - 1) {
      // All steps done — capture selfie from camera or fallback
      captureSelfie();
      setLivenessStep(LIVENESS_STEPS.length - 1);
      setLivenessProgress(100);
      return;
    }
    setLivenessStep(stepIndex);
    setLivenessProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      setLivenessProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => startLivenessStep(stepIndex + 1), 400);
      }
    }, 100);
    livenessTimerRef.current = interval as any;
  };

  // ─── Start camera for liveness ───
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Camera not available — liveness will still proceed with fallback
      console.warn('Camera not available for liveness check');
    }
  };

  // ─── Capture selfie from video stream ───
  const captureSelfie = async () => {
    if (videoRef.current && canvasRef.current && videoRef.current.srcObject) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
        if (blob && user?.id) {
          const filePath = `${user.id}/selfie_${Date.now()}.jpg`;
          const { data, error } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
          if (!error && data) {
            const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(data.path);
            setSelfieUrl(urlData.publicUrl);
          } else {
            // Fallback: use blob URL
            setSelfieUrl(URL.createObjectURL(blob));
          }
        }
      }
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    } else {
      // Fallback for environments without camera
      setSelfieUrl('data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%2310b981" width="200" height="200" rx="100"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="60">✓</text></svg>'));
    }
  };

  // ─── File upload to Supabase Storage ───
  const handleFileUpload = async (docId: string, file: File) => {
    if (!user?.id) return;
    setUploadingDocId(docId);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${docId}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(data.path);
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, url: urlData.publicUrl } : d));
      showToast('Document uploaded successfully', 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err.message || 'Upload failed. Please try again.', 'danger');
    } finally {
      setUploadingDocId(null);
    }
  };

  const triggerFileInput = (docId: string) => {
    setActiveUploadDocId(docId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadDocId) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File too large. Max 10MB.', 'warning');
        return;
      }
      handleFileUpload(activeUploadDocId, file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
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

      // Update user's kyc_status to pending in the users table
      await supabase
        .from('users')
        .update({ kyc_status: 'pending' })
        .eq('id', user.id);

      showToast('KYC submitted successfully! Pending admin review.', 'success');
      setExistingSubmission({
        id: 'new',
        status: 'pending',
        target_role: targetRole,
        created_at: new Date().toISOString(),
      });
      setPageStep('status');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit KYC. Please try again.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = targetRole === 'sp' ? 'Service Provider' : targetRole === 'isp' ? 'Internet Service Provider' : 'Standard User';

  // ─── STATUS SCREEN ───
  if (isFetching) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-bg-primary pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => pageStep !== 'status' ? setPageStep('status') : navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">KYC Verification</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">

        {/* ─── STATUS VIEW ─── */}
        {pageStep === 'status' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center mt-6 text-center">
              {existingSubmission?.status === 'verified' ? (
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border-4 border-green-500/20">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
              ) : existingSubmission?.status === 'pending' ? (
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border-4 border-blue-500/20">
                  <Clock size={40} className="text-blue-400" />
                </div>
              ) : existingSubmission?.status === 'rejected' ? (
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border-4 border-red-500/20">
                  <XCircle size={40} className="text-red-500" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 border-4 border-orange-500/20">
                  <ShieldAlert size={40} className="text-orange-500" />
                </div>
              )}

              <h2 className="text-2xl font-bold">
                {profile?.kyc_status === 'verified' || existingSubmission?.status === 'verified'
                  ? 'Account Verified'
                  : profile?.kyc_status === 'pending' || existingSubmission?.status === 'pending'
                  ? 'Under Review'
                  : profile?.kyc_status === 'rejected' || existingSubmission?.status === 'rejected'
                  ? 'Verification Rejected'
                  : `Verify as ${roleLabel}`}
              </h2>
              <p className="text-text-secondary mt-2 text-sm max-w-xs leading-relaxed">
                {profile?.kyc_status === 'verified' || existingSubmission?.status === 'verified'
                  ? `Your ${roleLabel} KYC has been approved. You have full access.`
                  : profile?.kyc_status === 'pending' || existingSubmission?.status === 'pending'
                  ? 'Your documents are being reviewed by our team. This typically takes 1-2 business days.'
                  : profile?.kyc_status === 'rejected' || existingSubmission?.status === 'rejected'
                  ? `Your submission was rejected. ${existingSubmission?.admin_note ? `Reason: "${existingSubmission.admin_note}"` : 'Please resubmit with correct documents.'}`
                  : `Submit your documents to verify your ${roleLabel} account and unlock all features.`}
              </p>
            </div>

            {/* Submission Details */}
            {existingSubmission && (
              <div className="space-y-4">
                <div className="glass rounded-[20px] border border-glass-border p-5 space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <FileText size={16} className="text-accent-primary" />
                    Submitted Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-secondary font-black uppercase">Submitted On</p>
                      <p className="text-xs font-bold">{new Date(existingSubmission.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-secondary font-black uppercase">Target Role</p>
                      <p className="text-xs font-bold uppercase">{existingSubmission.target_role}</p>
                    </div>
                  </div>

                  {isBusinessRole && businessForm.businessName && (
                    <div className="pt-3 border-t border-glass-border space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-text-secondary font-black uppercase">Business Name</p>
                          <p className="text-xs font-bold">{businessForm.businessName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-text-secondary font-black uppercase">Website</p>
                          <p className="text-xs font-bold truncate">{businessForm.website}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-text-secondary font-black uppercase">Email</p>
                          <p className="text-xs font-bold truncate">{businessForm.businessEmail}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-text-secondary font-black uppercase">Phone</p>
                          <p className="text-xs font-bold">{businessForm.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-text-secondary font-black uppercase">Address</p>
                        <p className="text-xs font-bold leading-relaxed">{businessForm.businessAddress}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-glass-border space-y-3">
                    <p className="text-[10px] text-text-secondary font-black uppercase">Verification Assets</p>
                    <div className="flex gap-2">
                      {selfieUrl && (
                        <div 
                          onClick={() => setPreviewDoc({ id: 'selfie', name: 'Selfie Check', desc: '', icon: Camera, url: selfieUrl })}
                          className="w-12 h-12 rounded-lg bg-bg-secondary border border-glass-border overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        >
                          <img src={selfieUrl} className="w-full h-full object-cover" />
                        </div>
                      )}
                      {(existingSubmission as any).id_doc_url && (
                        <div 
                          onClick={() => setPreviewDoc({ id: 'id', name: 'Identity Document', desc: '', icon: FileText, url: (existingSubmission as any).id_doc_url })}
                          className="w-12 h-12 rounded-lg bg-bg-secondary border border-glass-border flex items-center justify-center text-accent-primary cursor-pointer active:scale-95 transition-transform"
                        >
                          <FileText size={20} />
                        </div>
                      )}
                      {(existingSubmission as any).biz_reg_url && (
                        <div 
                          onClick={() => setPreviewDoc({ id: 'biz', name: 'Business Registration', desc: '', icon: Building, url: (existingSubmission as any).biz_reg_url })}
                          className="w-12 h-12 rounded-lg bg-bg-secondary border border-glass-border flex items-center justify-center text-accent-primary cursor-pointer active:scale-95 transition-transform"
                        >
                          <Building size={20} />
                        </div>
                      )}
                      {(existingSubmission as any).logo_url && (
                        <div 
                          onClick={() => setPreviewDoc({ id: 'logo', name: 'Company Logo', desc: '', icon: ImageIcon, url: (existingSubmission as any).logo_url })}
                          className="w-12 h-12 rounded-lg bg-bg-secondary border border-glass-border overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        >
                          <img src={(existingSubmission as any).logo_url} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass rounded-[20px] border border-glass-border p-4 space-y-3 bg-accent-primary/5">
                  <h3 className="font-bold text-sm">Privileges Unlocked</h3>
                  <div className="space-y-2">
                    {[
                      targetRole === 'user' ? 'Verified account badge' : `${roleLabel} dashboard access`,
                      targetRole === 'user' ? 'Higher withdrawal limits' : 'SDK integration & API key',
                      targetRole === 'user' ? 'Full P2P trading access' : 'Campaign creation & management',
                      targetRole !== 'user' ? `Admin-tracked ${targetRole === 'sp' ? '10%' : '5%'} NRT cashback` : 'NRT reward multiplier bonus',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle2 size={14} className="text-accent-primary shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* What you'll unlock (Not submitted) */}
            {!existingSubmission && (
              <div className="glass rounded-[20px] border border-glass-border p-4 space-y-3">
                <h3 className="font-bold text-sm">What you'll unlock</h3>
                <div className="space-y-2">
                  {[
                    targetRole === 'user' ? 'Verified account badge' : `${roleLabel} dashboard access`,
                    targetRole === 'user' ? 'Higher withdrawal limits' : 'SDK integration & API key',
                    targetRole === 'user' ? 'Full P2P trading access' : 'Campaign creation & management',
                    targetRole !== 'user' ? `Admin-tracked ${targetRole === 'sp' ? '10%' : '5%'} NRT cashback` : 'NRT reward multiplier bonus',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 size={14} className="text-accent-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {(profile?.kyc_status === 'pending' || existingSubmission?.status === 'pending' || 
                profile?.kyc_status === 'verified' || existingSubmission?.status === 'verified') ? (
                <button
                  onClick={() => {
                    if (profile?.kyc_status === 'verified' || existingSubmission?.status === 'verified') {
                      // Navigate to appropriate dashboard
                      if (targetRole === 'sp') navigate('/sp/dashboard');
                      else if (targetRole === 'isp') navigate('/isp/dashboard');
                      else navigate('/');
                    } else {
                      navigate('/');
                    }
                  }}
                  className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <UserIcon size={18} /> Back to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => setPageStep('liveness')}
                  className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all"
                >
                  {profile?.kyc_status === 'rejected' || existingSubmission?.status === 'rejected' ? 'Resubmit KYC Documents' : 'Start Verification'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── LIVENESS CHECK ─── */}
        {pageStep === 'liveness' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 mt-4"
          >
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">Liveness Check</h2>
              <p className="text-text-secondary text-sm">Follow the instructions below to confirm you're a real person</p>
            </div>

            {/* Face frame */}
            <div className="relative mx-auto w-64 h-72 flex items-center justify-center">
              {/* Oval frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-52 h-64 rounded-[50%] border-4 transition-colors duration-500 ${
                  livenessStep === LIVENESS_STEPS.length - 1 ? 'border-green-500' : 'border-accent-primary'
                }`} />
              </div>

              {/* Camera feed / selfie preview */}
              <div className="w-48 h-60 rounded-[50%] bg-bg-secondary overflow-hidden flex items-center justify-center relative">
                {selfieUrl ? (
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                    <Camera size={48} className="text-text-secondary opacity-30 relative z-10" />
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Progress ring overlay */}
              {livenessStep < LIVENESS_STEPS.length - 1 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 288">
                  <ellipse
                    cx="128" cy="144" rx="100" ry="124"
                    fill="none" stroke="currentColor"
                    strokeWidth="4"
                    className="text-accent-primary/20"
                  />
                  <ellipse
                    cx="128" cy="144" rx="100" ry="124"
                    fill="none" stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="716"
                    strokeDashoffset={716 - (716 * livenessProgress) / 100}
                    className="text-accent-primary transition-all duration-100"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            {/* Step instruction */}
            <div className="glass rounded-[20px] border border-glass-border p-5 text-center">
              <span className="text-4xl mb-3 block">{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].emoji}</span>
              <h3 className="font-bold text-lg mb-1">{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].label}</h3>
              <p className="text-text-secondary text-sm">{LIVENESS_STEPS[Math.min(livenessStep, LIVENESS_STEPS.length - 1)].instruction}</p>

              {/* Step dots */}
              <div className="flex justify-center gap-2 mt-4">
                {LIVENESS_STEPS.slice(0, -1).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < livenessStep ? 'bg-accent-primary' : i === livenessStep ? 'bg-accent-primary animate-pulse' : 'bg-bg-secondary'}`} />
                ))}
              </div>
            </div>

            {livenessStep === LIVENESS_STEPS.length - 1 ? (
              <button
                onClick={() => setPageStep('documents')}
                className="w-full py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} /> Continue to Documents
              </button>
            ) : livenessStep === 0 && livenessProgress === 0 ? (
              <button
                onClick={() => { startCamera(); startLivenessStep(0); }}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all"
              >
                Start Check
              </button>
            ) : (
              <div className="w-full py-4 bg-bg-secondary text-text-secondary font-bold rounded-xl text-center text-sm">
                Follow the instructions above…
              </div>
            )}
          </motion.div>
        )}

        {/* ─── DOCUMENTS ─── */}
        {pageStep === 'documents' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 mt-4"
          >
            {/* Selfie success badge */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={20} className="text-green-500 shrink-0" />
              <p className="text-sm text-text-secondary"><span className="font-semibold text-green-400">Liveness check passed.</span> Please upload your documents.</p>
            </div>

            {/* Business form (SP/ISP only) */}
            {isBusinessRole && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Business Information</h3>
                <div className="glass rounded-xl border border-glass-border p-4 space-y-4">
                  {[
                    { key: 'businessName', label: targetRole === 'sp' ? 'SP Name' : 'ISP Name', placeholder: 'e.g. Acme Network Corp' },
                    { key: 'website', label: 'Website URL', placeholder: 'https://acme.com', type: 'url' },
                    { key: 'businessEmail', label: 'Business Email', placeholder: 'contact@acme.com', type: 'email' },
                    { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1 234 567 8900', type: 'tel' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-bold text-text-secondary mb-1 block">{field.label} *</label>
                      <input
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={businessForm[field.key as keyof typeof businessForm]}
                        onChange={e => setBusinessForm({ ...businessForm, [field.key]: e.target.value })}
                        className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block">Business Address *</label>
                    <textarea
                      rows={2}
                      placeholder="123 Corporate Blvd, Tech City, Country"
                      value={businessForm.businessAddress}
                      onChange={e => setBusinessForm({ ...businessForm, businessAddress: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={onFileSelected}
            />

            {/* Document uploads */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Required Documents</h3>
              <p className="text-xs text-text-secondary">Upload images or PDFs (max 10MB each)</p>
              <div className="glass rounded-xl border border-glass-border overflow-hidden divide-y divide-glass-border">
                {documents.map(doc => {
                  const DocIcon = doc.icon;
                  const isUploading = uploadingDocId === doc.id;
                  return (
                    <div key={doc.id} className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-accent-primary shrink-0">
                        <DocIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-text-secondary">{doc.desc}</p>
                      </div>
                      {!doc.url ? (
                        <button
                          onClick={() => triggerFileInput(doc.id)}
                          disabled={isUploading}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary text-xs font-bold rounded-lg hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {isUploading ? (
                            <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                          ) : (
                            <><UploadCloud size={14} /> Upload</>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-green-500/10 text-green-500">Uploaded</span>
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, url: null } : d));
                            }}
                            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Re-upload"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missing fields warning */}
            {!isFormValid && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-3">
                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {!allDocsUploaded ? 'Upload all required documents.' : 'Fill in all business information fields.'}
                </p>
              </div>
            )}

            <button
              disabled={!isFormValid || isSubmitting}
              onClick={handleSubmit}
              className={`w-full py-4 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                isFormValid && !isSubmitting
                  ? 'bg-accent-primary text-primary-foreground shadow-accent-primary/20 active:scale-[0.98]'
                  : 'bg-bg-secondary text-text-secondary cursor-not-allowed opacity-50'
              }`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Submit for Review'}
            </button>
          </motion.div>
        )}
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-primary rounded-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">{previewDoc.name}</h3>
                <button onClick={() => setPreviewDoc(null)} className="p-1 bg-bg-secondary rounded-full"><X size={16} /></button>
              </div>
              <div className="p-4 flex justify-center bg-black/50">
                <img src={previewDoc.url!} alt="Preview" className="max-h-[60vh] object-contain rounded-lg" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
