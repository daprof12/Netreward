import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, QrCode, CheckCircle2, ShoppingCart,
  ArrowRight, Fingerprint, Loader2, AlertCircle, RefreshCw, XCircle,
  Camera, CameraOff, SwitchCamera, FlipHorizontal2
} from 'lucide-react';
import jsQR from 'jsqr';
import { useWalletStore } from '@/stores/useWalletStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import PinEntryModal from '@/components/ui/PinEntryModal';
import BiometricPromptModal from '@/components/ui/BiometricPromptModal';
import { usePageTitle } from '@/hooks/usePageTitle';

type ScanStep = 'requesting' | 'scanning' | 'decoding' | 'detected' | 'authenticating' | 'success' | 'failed' | 'camera_error';

interface CheckoutSession {
  id: string;
  merchantId: string;
  merchantName: string;
  amountNrt: number;
  description: string;
  status: string;
  expiresAt: string;
}

export default function ScanToPay() {
  usePageTitle('Scan to Pay');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balanceNRT, fiatValue, fetchBalance } = useWalletStore();
  const { biometricsEnabled, isBiometricSetup, pin } = useSecurityStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<ScanStep>('requesting');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [detectedSession, setDetectedSession] = useState<CheckoutSession | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // ── Camera management ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    stopCamera();
    setStep('requesting');
    setCameraErrorMsg('');

    // iOS/Android constraint fallback chain:
    // 1. Ideal resolution + ideal facingMode (best quality)
    // 2. Just facingMode (no resolution — avoids silent mobile failures)
    // 3. Any video at all (ultimate fallback)
    const constraintOptions: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: facing }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastErr: any;

    for (const opts of constraintOptions) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(opts);
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!stream) {
      const err = lastErr;
      console.error('Camera error:', err);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : err?.name === 'NotReadableError'
          ? 'Camera is already in use by another app.'
          : `Camera error: ${err?.message ?? 'Unknown error'}`;
      setCameraErrorMsg(msg);
      setStep('camera_error');
      return;
    }

    streamRef.current = stream;

    if (videoRef.current) {
      const video = videoRef.current;
      // Required attributes for iOS Safari
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true'); // older iOS
      video.muted = true;
      video.srcObject = stream;

      // iOS requires play() to be called inside loadedmetadata/canplay,
      // not immediately after srcObject assignment.
      await new Promise<void>((resolve) => {
        const onReady = async () => {
          try { await video.play(); } catch { /* autoplay policy — video may still render */ }
          resolve();
        };
        video.addEventListener('loadedmetadata', onReady, { once: true });
        video.addEventListener('canplay', onReady, { once: true });
        // Safety timeout: if neither event fires within 3s, proceed anyway
        setTimeout(resolve, 3000);
      });
    }

    setStep('scanning');
  }, [stopCamera]);

  // Start camera on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── QR scan loop ───────────────────────────────────────────────
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return; }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && !isProcessingRef.current) {
      isProcessingRef.current = true;
      handleQrDetected(code.data);
    } else {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start scan loop when step is 'scanning'
  useEffect(() => {
    if (step === 'scanning') {
      rafRef.current = requestAnimationFrame(scanFrame);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [step, scanFrame]);

  // ── QR decode & session lookup ─────────────────────────────────
  const handleQrDetected = async (rawData: string) => {
    setStep('decoding');

    try {
      // QR payload is JSON: { sessionId, merchantId, amountNrt, ref, exp }
      let payload: { sessionId?: string; ref?: string; exp?: number; amountNrt?: number } = {};
      try {
        payload = JSON.parse(rawData);
      } catch {
        // Try treating the raw string as a session ID directly
        payload = { sessionId: rawData };
      }

      const sessionId = payload.sessionId || rawData;

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('scan2pay_sessions')
        .select('id, merchant_id, amount_nrt, description, status, expires_at')
        .eq('id', sessionId)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        throw new Error('QR code is invalid, already used, or has expired.');
      }

      // Check expiry client-side too
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('This payment request has expired. Ask the merchant to generate a new one.');
      }

      // Fetch merchant name
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', data.merchant_id)
        .single();

      const session: CheckoutSession = {
        id: data.id,
        merchantId: data.merchant_id,
        merchantName: profile?.display_name || 'Merchant',
        amountNrt: data.amount_nrt,
        description: data.description,
        status: data.status,
        expiresAt: data.expires_at,
      };

      // Stop camera after successful decode to save battery
      stopCamera();
      setDetectedSession(session);
      setStep('detected');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read QR code. Please try again.');
      setStep('failed');
    }
  };

  // ── Payment flow ───────────────────────────────────────────────
  const handlePay = () => {
    if (!detectedSession) return;

    if (balanceNRT < detectedSession.amountNrt) {
      setErrorMsg('Insufficient NRT balance to complete this transaction.');
      setStep('failed');
      return;
    }

    if (biometricsEnabled && isBiometricSetup) {
      setShowBiometricModal(true);
    } else if (pin) {
      setShowPinModal(true);
    } else {
      completePayment();
    }
  };

  const completePayment = async () => {
    if (!detectedSession || !user) return;
    setStep('authenticating');

    try {
      const { data, error } = await supabase.rpc('process_scan2pay', {
        p_session_id: detectedSession.id,
        p_payer_id: user.id,
      });

      if (error) throw error;
      if (data?.status === 'error') throw new Error(data.message);

      await fetchBalance(user.id);
      setStep('success');
      showToast('Payment confirmed!', 'success');
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Transaction failed. Please try again.');
      setStep('failed');
    }
  };

  const handleReset = () => {
    setDetectedSession(null);
    setErrorMsg('');
    isProcessingRef.current = false;
    startCamera(facingMode);
  };

  const amountUsd = detectedSession
    ? (detectedSession.amountNrt * fiatValue).toFixed(2)
    : '0.00';

  // ── Render ─────────────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen bg-bg-primary flex flex-col pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8 z-10 relative">
        <button
          onClick={() => { stopCamera(); navigate(-1); }}
          className="p-2 bg-bg-secondary rounded-full"
        >
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <h1 className="text-lg font-bold">Scan2Pay</h1>
        {step === 'scanning' ? (
          <button
            onClick={() => {
              const next = facingMode === 'environment' ? 'user' : 'environment';
              setFacingMode(next);
              startCamera(next);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary rounded-full border border-glass-border"
            title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'}
          >
            {facingMode === 'environment' ? (
              <>
                <SwitchCamera size={16} className="text-accent-primary" />
                <span className="text-[10px] font-bold text-accent-primary">Rear</span>
              </>
            ) : (
              <>
                <FlipHorizontal2 size={16} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400">Front</span>
              </>
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Requesting permission ── */}
        {step === 'requesting' && (
          <motion.div
            key="requesting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center">
              <Camera size={36} className="text-accent-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Starting Camera</h2>
              <p className="text-sm text-text-secondary">Please allow camera access when prompted.</p>
            </div>
            <Loader2 size={24} className="animate-spin text-accent-primary" />
          </motion.div>
        )}

        {/* ── Camera error ── */}
        {step === 'camera_error' && (
          <motion.div
            key="camera_error"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center border-4 border-amber-500/20">
              <CameraOff size={44} className="text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Camera Unavailable</h2>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{cameraErrorMsg}</p>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={() => startCamera(facingMode)}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Try Again
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Scanning (live camera) ── */}
        {(step === 'scanning' || step === 'decoding') && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center relative"
          >
            {/* Live video — fullscreen behind overlay.
                iOS Safari bugs fixed:
                1. No overflow-hidden on wrapper (clips iOS video stream)
                2. translateZ(0) forces video onto its own GPU layer
                   (prevents blank video inside Framer Motion transformed containers)
                3. objectFit via inline style (Tailwind class ignored on some iOS versions)
            */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#000',
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  // Force own GPU compositing layer — fixes iOS blank video
                  // inside CSS-transform-animated parent (Framer Motion)
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  display: 'block',
                }}
              />
            </div>

            {/* Hidden canvas for jsQR */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay with viewfinder */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-white drop-shadow">Scan QR Code</h2>
                <p className="text-sm text-white/70 drop-shadow">Align the merchant's QR code within the frame</p>
              </div>

              {/* Viewfinder frame */}
              <div className="relative w-64 h-64">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent-primary rounded-br-lg" />

                {/* Scan line */}
                {step === 'scanning' && (
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 bg-accent-primary shadow-[0_0_12px_var(--accent-primary)]"
                    animate={{ top: ['8px', '248px', '8px'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                {/* Decoding spinner overlay */}
                {step === 'decoding' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                    <Loader2 size={40} className="text-accent-primary animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-white font-medium bg-black/40 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10">
                {step === 'decoding' ? (
                  <><Loader2 size={15} className="animate-spin" /><span className="text-sm">Reading QR code…</span></>
                ) : (
                  <><div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" /><span className="text-sm">Camera active — point at a QR code</span></>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Session detected ── */}
        {step === 'detected' && detectedSession && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="flex-1 flex flex-col p-6"
          >
            <div className="flex-1" />
            <div className="glass p-6 rounded-3xl border border-glass-border space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none -mt-4 -mr-4">
                <ShoppingCart size={150} />
              </div>

              <div className="relative z-10 text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-emerald-500/20">
                  <QrCode size={24} className="text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">QR Code Scanned</p>
                <h2 className="text-xl font-bold">{detectedSession.description}</h2>
                <p className="text-sm text-text-secondary">from {detectedSession.merchantName}</p>
              </div>

              <div className="relative z-10 bg-bg-secondary p-4 rounded-xl border border-glass-border space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-text-secondary">Amount Due</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-text-primary">{detectedSession.amountNrt.toFixed(2)} NRT</span>
                    <p className="text-xs text-text-secondary">≈ ${amountUsd} USD</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-glass-border mt-2">
                  <span className="text-xs text-text-secondary">Your Balance</span>
                  <span className={`text-sm font-bold ${balanceNRT < detectedSession.amountNrt ? 'text-red-400' : 'text-emerald-400'}`}>
                    {balanceNRT.toFixed(2)} NRT
                  </span>
                </div>
              </div>

              {balanceNRT < detectedSession.amountNrt && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">Insufficient NRT balance. Please top up your wallet first.</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handlePay}
                  disabled={balanceNRT < detectedSession.amountNrt}
                  className="relative z-10 w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {biometricsEnabled && isBiometricSetup ? (
                    <>Confirm with Biometrics <Fingerprint size={18} /></>
                  ) : pin ? (
                    <>Confirm with PIN <ArrowRight size={18} /></>
                  ) : (
                    <>Confirm Payment <ArrowRight size={18} /></>
                  )}
                </button>

                {biometricsEnabled && isBiometricSetup && pin && (
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="relative z-10 w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border flex items-center justify-center gap-2"
                  >
                    Use PIN Instead
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="relative z-10 w-full py-2 text-sm text-text-secondary font-medium"
                >
                  Cancel & Scan Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Authenticating / Processing ── */}
        {step === 'authenticating' && (
          <motion.div
            key="authenticating"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8"
          >
            <div className="relative w-32 h-32">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-accent-primary/20"
              />
              <div className="absolute inset-0 flex items-center justify-center text-accent-primary">
                {biometricsEnabled && isBiometricSetup
                  ? <Fingerprint size={64} className="animate-pulse" />
                  : <Loader2 size={64} className="animate-spin opacity-60" />}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Processing</h2>
              <p className="text-text-secondary">Confirming your transaction…</p>
            </div>
          </motion.div>
        )}

        {/* ── Success ── */}
        {step === 'success' && detectedSession && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/30"
            >
              <CheckCircle2 size={56} className="text-emerald-400" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="text-sm text-text-secondary">
                You paid <span className="font-bold text-text-primary">{detectedSession.amountNrt.toFixed(2)} NRT</span> to {detectedSession.merchantName}.
              </p>
            </div>
            <div className="w-full pt-4 space-y-3">
              <button
                onClick={() => navigate('/transactions')}
                className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
              >
                View Receipt
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Failed ── */}
        {step === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
              <XCircle size={50} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Payment Failed</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {errorMsg || 'We encountered an error while processing your payment. Please try again.'}
              </p>
            </div>
            <div className="w-full pt-4 space-y-3">
              <button
                onClick={handleReset}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Scan Again
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => { setShowPinModal(false); completePayment(); }}
        title="Payment Confirmation"
        description="Enter your PIN to confirm this payment"
        expectedPin={pin}
      />

      <BiometricPromptModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccess={() => { setShowBiometricModal(false); completePayment(); }}
        title="Confirm Payment"
        description="Verify to approve this transaction"
      />
    </motion.div>
  );
}
