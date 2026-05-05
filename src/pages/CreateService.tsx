import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Globe, Smartphone, Play, Image as ImageIcon, CheckCircle2, Loader2, ArrowRight, ChevronDown, Lock, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpStore, type SpService } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';

const CATEGORIES = ['Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Other'];

import { useFormStore } from '@/stores/useFormStore';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function CreateService() {
  usePageTitle('Create Service');
  const navigate = useNavigate();
  const { addService } = useSpStore();
  const { showToast } = useToastStore();
  
  const { drafts, updateServiceDraft, clearServiceDraft } = useFormStore();
  const draft = drafts.service;

  useEffect(() => {
    clearServiceDraft();
  }, [clearServiceDraft]);

  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');

  // Derived state from draft
  const name = draft.name;
  const description = draft.description;
  const category = draft.category;
  const webUrl = draft.webUrl;
  const webDomain = draft.webDomain;
  const androidUrl = draft.androidUrl;
  const androidPackage = draft.androidPackage;
  const iosUrl = draft.iosUrl;
  const iosBundle = draft.iosBundle;
  const webhookUrl = draft.webhookUrl;
  const logoPreview = draft.logoPreview;

  const setName = (val: string) => updateServiceDraft({ name: val });
  const setDescription = (val: string) => updateServiceDraft({ description: val });
  const setCategory = (val: string) => updateServiceDraft({ category: val });
  const setWebUrl = (val: string) => updateServiceDraft({ webUrl: val });
  const setWebDomain = (val: string) => updateServiceDraft({ webDomain: val });
  const setAndroidUrl = (val: string) => updateServiceDraft({ androidUrl: val });
  const setAndroidPackage = (val: string) => updateServiceDraft({ androidPackage: val });
  const setIosUrl = (val: string) => updateServiceDraft({ iosUrl: val });
  const setIosBundle = (val: string) => updateServiceDraft({ iosBundle: val });
  const setWebhookUrl = (val: string) => updateServiceDraft({ webhookUrl: val });
  const setLogoPreview = (val: string | null) => updateServiceDraft({ logoPreview: val });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const [credentials, setCredentials] = useState<{apiKey: string, secretKey: string, webhookSecret: string} | null>(null);

  const canContinue = name.trim().length > 0 && (webUrl.trim() || androidUrl.trim() || iosUrl.trim());

  const handleContinue = () => {
    if (!canContinue) return;
    setStep('verifying');

    // Simulate integration verification (checking SDKs, APIs)
    setTimeout(async () => {
      const generatedCreds = {
        apiKey: 'nr_live_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
        secretKey: 'nr_sk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 32),
        webhookSecret: 'nr_wh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      };
      
      setCredentials(generatedCreds);

      try {
        await addService({
          name,
          description,
          category,
          webUrl,
          webDomain,
          androidUrl,
          androidPackageName: androidPackage,
          iosUrl,
          iosBundleId: iosBundle,
          webhookUrl,
          logoUrl: logoPreview || undefined,
          ...generatedCreds
        });
        setStep('success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create service', 'danger');
        setStep('form');
      }
    }, 4500);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string, id: string }) => (
    <button onClick={() => handleCopy(text, id)} className="text-accent-primary transition-all duration-300 shrink-0">
      <AnimatePresence mode="wait">
        {copiedId === id ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full"
          >
            <Check size={8} strokeWidth={3} /> Copied
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Copy size={14} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );

  const handleFinish = () => {
    showToast('Service successfully created and verified!', 'success');
    clearServiceDraft();
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          disabled={step === 'verifying'}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors disabled:opacity-50"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">New Service</h1>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 space-y-6"
          >
            {/* Logo Upload */}
            <div className="flex flex-col items-center">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setLogoPreview(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-3xl bg-bg-secondary border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors cursor-pointer mb-2 overflow-hidden relative"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon size={28} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logo</span>
                  </>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Service Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Netflix, Spotify"
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Briefly describe your service..."
                  rows={2}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                />
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Category</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-text-primary flex items-center justify-between"
                >
                  {category}
                  <ChevronDown size={18} className="text-text-secondary" />
                </button>
                <AnimatePresence>
                  {showCategoryDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                    >
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                          className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors ${category === cat ? 'text-accent-primary font-bold bg-accent-primary/5' : 'text-text-primary'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Platform & SDK Integration */}
            <div className="space-y-6 pt-4 border-t border-glass-border">
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Integration Details</h3>
                <p className="text-xs text-text-secondary">Used for tracking, verification, and webhooks.</p>
              </div>

              {/* Web */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-accent-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Web Platform</span>
                </div>
                <div className="space-y-3 pl-4 border-l border-glass-border">
                  <input
                    type="url"
                    value={webUrl}
                    onChange={e => setWebUrl(e.target.value)}
                    placeholder="Web App URL (https://...)"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                  <input
                    type="text"
                    value={webDomain}
                    onChange={e => setWebDomain(e.target.value)}
                    placeholder="Domain (e.g. netflix.com)"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              {/* Android */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={14} className="text-[#3DDC84]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Android Platform</span>
                </div>
                <div className="space-y-3 pl-4 border-l border-glass-border">
                  <input
                    type="url"
                    value={androidUrl}
                    onChange={e => setAndroidUrl(e.target.value)}
                    placeholder="Play Store URL"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#3DDC84]"
                  />
                  <input
                    type="text"
                    value={androidPackage}
                    onChange={e => setAndroidPackage(e.target.value)}
                    placeholder="Package Name (e.g. com.netflix.mediaclient)"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#3DDC84]"
                  />
                </div>
              </div>

              {/* iOS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-[#007AFF]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">iOS Platform</span>
                </div>
                <div className="space-y-3 pl-4 border-l border-glass-border">
                  <input
                    type="url"
                    value={iosUrl}
                    onChange={e => setIosUrl(e.target.value)}
                    placeholder="App Store URL"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#007AFF]"
                  />
                  <input
                    type="text"
                    value={iosBundle}
                    onChange={e => setIosBundle(e.target.value)}
                    placeholder="Bundle ID (e.g. com.netflix.Netflix)"
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Webhook */}
              <div className="space-y-3 pt-4 border-t border-glass-border">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Developer Callbacks</span>
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="Webhook URL (NRT will POST events here)"
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full py-4 mt-8 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${canContinue
                  ? 'bg-accent-primary text-primary-foreground shadow-accent-primary/20 active:scale-[0.98]'
                  : 'bg-bg-secondary text-text-secondary cursor-not-allowed opacity-50'
                }`}
            >
              Continue & Verify <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center pt-24 px-6 text-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-bg-secondary flex items-center justify-center">
                <Loader2 size={40} className="text-accent-primary animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-t-4 border-accent-primary animate-spin" style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Technical Verification</h2>
              <p className="text-text-secondary">We are performing pre-flight checks on your Package Names, Bundle IDs, and Webhook endpoints...</p>
            </div>

            <div className="w-full glass rounded-xl border border-glass-border p-4 space-y-3 mt-8">
              {[
                {text: 'Checking Android Package signature...', done: true},
                {text: 'Validating iOS Bundle record...', done: true},
                {text: 'Pinging Webhook endpoint...', done: false},
                {text: 'Verifying Domain ownership...', done: false},
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-left">
                  {item.done ? <CheckCircle2 size={14} className="text-green-500" /> : <Loader2 size={14} className="text-text-secondary animate-spin" />}
                  <span className={item.done ? 'text-text-primary' : 'text-text-secondary'}>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center pt-12 px-6 text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-4 border-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Registration Complete</h2>
              <p className="text-sm text-text-secondary">Your service is active. Use the credentials below to integrate the NetReward SDK.</p>
            </div>

            {/* Credentials Card */}
            {credentials && (
              <div className="w-full space-y-4 pt-4">
                <div className="glass rounded-2xl border border-glass-border p-5 space-y-4 text-left relative overflow-hidden bg-bg-secondary/50">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Lock size={100} />
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">API Key</label>
                        <CopyButton text={credentials.apiKey} id="api-key" />
                      </div>
                      <div className="bg-bg-primary/50 border border-glass-border rounded-lg px-3 py-2 text-[11px] font-mono text-text-primary break-all">
                        {credentials.apiKey}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Secret Key</label>
                        <CopyButton text={credentials.secretKey} id="secret-key" />
                      </div>
                      <div className="bg-bg-primary/50 border border-glass-border rounded-lg px-3 py-2 text-[11px] font-mono text-text-primary break-all">
                        {credentials.secretKey}
                      </div>
                      <p className="text-[9px] text-red-400 mt-1 font-medium">⚠️ Never share your secret key publicly.</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Webhook Secret</label>
                        <CopyButton text={credentials.webhookSecret} id="webhook-secret" />
                      </div>
                      <div className="bg-bg-primary/50 border border-glass-border rounded-lg px-3 py-2 text-[11px] font-mono text-text-primary break-all">
                        {credentials.webhookSecret}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-xl flex items-start gap-3 text-left">
                  <ShieldCheck size={20} className="text-accent-primary shrink-0" />
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Store these credentials securely. They will not be shown again in full for security reasons. You can rotate them from your Service Settings later.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleFinish}
              className="w-full py-4 mt-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all"
            >
              Finish & Exit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
