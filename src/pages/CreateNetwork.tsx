import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Image as ImageIcon, CheckCircle2, ArrowRight, ChevronDown, Network, Signal, Globe, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIspStore, type IspNetwork } from '@/stores/useIspStore';
import { useToastStore } from '@/stores/useToastStore';
import LocationSearch from '@/components/LocationSearch';
import * as z from 'zod';
import { usePageTitle } from '@/hooks/usePageTitle';

const CATEGORIES = ['Telecommunication', 'Satellite', 'Fiber', 'Mobile Network', 'Broadband', 'Other'];

const networkSchema = z.object({
  name: z.string().min(2, 'Network name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  country: z.string().min(1, 'Please select a location'),
  signalStrength: z.number().min(0).max(100),
  coverage: z.string().optional(),
  asn: z.string().optional(),
  ipRanges: z.string().optional(),
  handshakeUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  webhookUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export default function CreateNetwork() {
  usePageTitle('Create Network');
  const navigate = useNavigate();
  const { addNetwork } = useIspStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');

  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [country, setCountry] = useState('');
  const [signalStrength, setSignalStrength] = useState(75);
  const [coverage, setCoverage] = useState('');
  const [asn, setAsn] = useState('');
  const [ipRanges, setIpRanges] = useState('');
  const [handshakeUrl, setHandshakeUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canContinue = name.trim().length >= 2 && country.trim().length > 0;

  // Generated credentials (shown after success)
  const [generatedApiKey] = useState(`nrt_isp_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`);
  const [generatedApiSecret] = useState(`nrt_secret_${crypto.randomUUID().replace(/-/g, '')}`);

  const handleContinue = () => {
    try {
      networkSchema.parse({
        name, category, country, signalStrength, coverage, asn, ipRanges, handshakeUrl, webhookUrl
      });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        showToast('Please fix the errors in the form', 'danger');
        return;
      }
    }
    
    setStep('verifying');
    
    setTimeout(async () => {
      try {
        await addNetwork({
          name,
          category,
          logoUrl: logoPreview || undefined,
          country,
          signalStrength,
          coverage: coverage || undefined,
          asn: asn || undefined,
          ipRanges: ipRanges ? ipRanges.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
          handshakeUrl: handshakeUrl || undefined,
          webhookUrl: webhookUrl || undefined,
          apiKey: generatedApiKey,
          apiSecret: generatedApiSecret
        });
        setStep('success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create network', 'danger');
        setStep('form');
      }
    }, 3500);
  };

  const handleFinish = () => {
    showToast('Network successfully verified and created!', 'success');
    navigate(-1);
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
          disabled={step === 'verifying'}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors disabled:opacity-50"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">New Network</h1>
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
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Network Name *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. T-Mobile, Starlink..."
                  className={`w-full bg-bg-secondary border ${errors.name ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Category</label>
                <div 
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`w-full bg-bg-secondary border ${errors.category ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3.5 text-sm text-text-primary flex justify-between items-center cursor-pointer font-medium hover:border-glass-border-hover transition-colors`}
                >
                  <span>{category}</span>
                  <ChevronDown size={18} className={`text-text-secondary transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </div>
                {errors.category && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.category}</p>}

                <AnimatePresence>
                  {showCategoryDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-10 w-full mt-2 py-2 bg-bg-secondary border border-glass-border rounded-xl shadow-xl overflow-hidden"
                    >
                      {CATEGORIES.map(cat => (
                        <div
                          key={cat}
                          onClick={() => {
                            setCategory(cat);
                            setShowCategoryDropdown(false);
                          }}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                            category === cat ? 'bg-accent-primary/10 text-accent-primary font-bold' : 'text-text-primary hover:bg-glass-bg'
                          }`}
                        >
                          {cat}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Location Search */}
              <div className="relative">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Location *</label>
                <LocationSearch
                  value={country}
                  onChange={(val) => setCountry(val)}
                  placeholder="Search city, state, or country..."
                  hasError={!!errors.country}
                />
                {errors.country && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.country}</p>}
              </div>

              {/* Signal Strength Slider */}
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
                  <span className="flex items-center gap-1.5"><Signal size={14} /> Signal Strength</span>
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={signalStrength}
                    onChange={e => setSignalStrength(Number(e.target.value))}
                    className="flex-1 h-2 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent-primary"
                  />
                  <span className={`text-sm font-bold min-w-[44px] text-right ${
                    signalStrength >= 75 ? 'text-green-500' : signalStrength >= 40 ? 'text-amber-500' : 'text-red-500'
                  }`}>{signalStrength}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                  <span>Weak</span>
                  <span>Strong</span>
                </div>
              </div>

              {/* Coverage */}
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
                  <span className="flex items-center gap-1.5"><Globe size={14} /> Coverage Regions</span>
                </label>
                <input 
                  type="text" 
                  value={coverage}
                  onChange={e => setCoverage(e.target.value)}
                  placeholder="e.g. North America, Europe, Asia-Pacific"
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium"
                />
              </div>
            </div>

            {/* Technical Details (collapsed section) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Network size={14} /> Technical Configuration
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">ASN</label>
                  <input 
                    type="text" 
                    value={asn}
                    onChange={e => setAsn(e.target.value)}
                    placeholder="e.g. AS6453"
                    className={`w-full bg-bg-secondary border ${errors.asn ? 'border-red-500' : 'border-glass-border'} rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium`}
                  />
                  {errors.asn && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.asn}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Handshake URL</label>
                  <input 
                    type="text" 
                    value={handshakeUrl}
                    onChange={e => setHandshakeUrl(e.target.value)}
                    placeholder="https://..."
                    className={`w-full bg-bg-secondary border ${errors.handshakeUrl ? 'border-red-500' : 'border-glass-border'} rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium`}
                  />
                  {errors.handshakeUrl && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.handshakeUrl}</p>}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">IP Ranges (CIDR blocks, one per line)</label>
                <textarea 
                  value={ipRanges}
                  onChange={e => setIpRanges(e.target.value)}
                  placeholder={"197.210.0.0/16\n102.89.0.0/16"}
                  rows={3}
                  className={`w-full bg-bg-secondary border ${errors.ipRanges ? 'border-red-500' : 'border-glass-border'} rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium font-mono resize-none`}
                />
                {errors.ipRanges && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.ipRanges}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Webhook URL</label>
                <input 
                  type="text" 
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://your-isp.com/webhooks/netreward"
                  className={`w-full bg-bg-secondary border ${errors.webhookUrl ? 'border-red-500' : 'border-glass-border'} rounded-xl px-3 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors placeholder:text-text-secondary/50 font-medium`}
                />
                {errors.webhookUrl && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.webhookUrl}</p>}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-bold text-sm py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-primary/20 active:scale-95 transition-all"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'verifying' && (
          <motion.div 
            key="verifying"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-bg-secondary border-t-accent-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Network size={32} className="text-accent-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Verifying Network...</h2>
            <p className="text-sm text-text-secondary max-w-[250px]">
              We are connecting to your network identity to establish the NetReward handshake API.
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Network Connected!</h2>
            <p className="text-sm text-text-secondary max-w-[280px] mb-8">
              Your network has been verified. Save your API credentials below — they will not be shown again.
            </p>

            {/* Credentials */}
            <div className="w-full max-w-sm space-y-3 text-left">
              <div className="glass p-4 rounded-xl border border-glass-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1"><Key size={12} /> API Key</label>
                  <CopyButton text={generatedApiKey} id="api-key" />
                </div>
                <p className="text-xs font-mono text-text-primary break-all bg-bg-secondary rounded-lg px-3 py-2">{generatedApiKey}</p>
              </div>
              <div className="glass p-4 rounded-xl border border-glass-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1"><Key size={12} /> API Secret</label>
                  <CopyButton text={generatedApiSecret} id="api-secret" />
                </div>
                <p className="text-xs font-mono text-text-primary break-all bg-bg-secondary rounded-lg px-3 py-2">{generatedApiSecret}</p>
              </div>
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-3 mt-2">
                <Signal size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-text-secondary leading-relaxed">Store these credentials securely. They cannot be retrieved once you leave this page.</p>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full max-w-sm mt-8 flex items-center justify-center bg-bg-secondary text-text-primary font-bold text-sm py-4 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
