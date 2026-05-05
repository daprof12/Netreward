import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Globe, Smartphone, Play, Image as ImageIcon, CheckCircle2, Loader2, ArrowRight, ChevronDown, Lock, ShieldCheck, Terminal, Copy, Save, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSpStore, type SpService } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

const CATEGORIES = ['Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Other'];

export default function EditService() {
  usePageTitle('Edit Service');
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { services, updateService, isLoading: isStoreLoading } = useSpStore();
  const { showToast } = useToastStore();
  
  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [webUrl, setWebUrl] = useState('');
  const [webDomain, setWebDomain] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [androidPackage, setAndroidPackage] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [iosBundle, setIosBundle] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [credentials, setCredentials] = useState<{apiKey: string, secretKey: string, webhookSecret: string} | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setCategory(service.category);
      setWebUrl(service.webUrl || '');
      setWebDomain(service.webDomain || '');
      setAndroidUrl(service.androidUrl || '');
      setAndroidPackage(service.androidPackageName || '');
      setIosUrl(service.iosUrl || '');
      setIosBundle(service.iosBundleId || '');
      setWebhookUrl(service.webhookUrl || '');
      setLogoPreview(service.logoUrl || null);
      setCredentials({
        apiKey: service.apiKey || '',
        secretKey: service.secretKey || '',
        webhookSecret: service.webhookSecret || ''
      });
    } else if (!isStoreLoading) {
      showToast('Service not found', 'danger');
      navigate('/campaigns?tab=services');
    }
  }, [serviceId, services, isStoreLoading, navigate, showToast]);

  const canContinue = name.trim().length > 0 && (webUrl.trim() || androidUrl.trim() || iosUrl.trim());

  const handleSave = async () => {
    if (!canContinue || !serviceId) return;
    setIsSaving(true);
    
    try {
      await updateService(serviceId, {
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
        logoUrl: logoPreview || undefined
      });
      showToast('Service updated successfully', 'success');
      navigate('/campaigns?tab=services');
    } catch (err: any) {
      showToast(err.message || 'Failed to update service', 'danger');
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Edit Service</h1>
        <button
          onClick={handleSave}
          disabled={!canContinue || isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent-primary text-primary-foreground rounded-lg font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      <div className="p-4 space-y-6">
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

        {/* Credentials Card (View Only) */}
        <div className="space-y-4 pt-4 border-t border-glass-border">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1">Service Credentials</h3>
            <p className="text-xs text-text-secondary font-medium">These are required for SDK integration.</p>
          </div>

          <div className="glass rounded-2xl border border-glass-border p-5 space-y-4 text-left relative overflow-hidden bg-bg-secondary/30">
            {credentials ? (
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
            ) : (
              <div className="py-4 text-center text-text-secondary text-sm italic">
                Loading credentials...
              </div>
            )}
          </div>
        </div>

        {/* Integration Details */}
        <div className="space-y-6 pt-4 border-t border-glass-border">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1">Integration Details</h3>
            <p className="text-xs text-text-secondary">Update your platform endpoints.</p>
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

        <div className="pt-4">
           <button
            onClick={handleSave}
            disabled={!canContinue || isSaving}
            className={`w-full py-4 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${canContinue
                ? 'bg-accent-primary text-primary-foreground shadow-accent-primary/20 active:scale-[0.98]'
                : 'bg-bg-secondary text-text-secondary cursor-not-allowed opacity-50'
              }`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
