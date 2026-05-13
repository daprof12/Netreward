import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Target, Calendar, DollarSign, RefreshCw, Calculator, ArrowRight, X, MapPin, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useIspStore, type IspCampaign } from '@/stores/useIspStore';
import { type TargetLocation } from '@/stores/useSpStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useToastStore } from '@/stores/useToastStore';
import MapSelectionModal from '@/components/MapSelectionModal';
import { useFormStore } from '@/stores/useFormStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSystemStore } from '@/stores/useSystemStore';

export default function CreateIspCampaign() {
  usePageTitle('Create ISP Campaign');
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { networks, addCampaign } = useIspStore();
  const { balanceNRT, fetchBalance } = useWalletStore();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  const { showToast } = useToastStore();
  const { settings } = useSystemStore();
  
  // Persistence logic (reusing campaign draft structure)
  const { drafts, updateCampaignDraft, clearCampaignDraft } = useFormStore();
  const draft = drafts.campaign;

  useEffect(() => {
    // Reset form draft on mount
    clearCampaignDraft();

    // Fetch fresh balance
    if (user) {
      fetchBalance(user.id);
    }

    // Check live profile status
    if (profile && profile.kyc_status !== 'verified') {
      showToast('You must complete KYC verification before creating a campaign.', 'danger');
      navigate('/settings/kyc', { replace: true, state: { targetRole: 'isp' } });
    }
  }, [profile, navigate, showToast, user, clearCampaignDraft, fetchBalance]);

  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state from draft
  const networkId = draft.serviceId; // Mapping serviceId field to networkId for ISP
  const name = draft.name;
  const targetLocations = draft.targetLocations;
  const budgetNrt = draft.budgetNrt;
  const startDate = draft.startDate;
  const endDate = draft.endDate;
  const isRecurring = draft.isRecurring;

  const setNetworkId = (val: string) => updateCampaignDraft({ serviceId: val });
  const setName = (val: string) => updateCampaignDraft({ name: val });
  const setTargetLocations = (val: any[]) => updateCampaignDraft({ targetLocations: val });
  const setBudgetNrt = (val: number | '') => updateCampaignDraft({ budgetNrt: val });
  const setStartDate = (val: string) => updateCampaignDraft({ startDate: val });
  const setEndDate = (val: string) => updateCampaignDraft({ endDate: val });
  const setIsRecurring = (val: boolean) => updateCampaignDraft({ isRecurring: val });

  const selectedNetwork = networks.find(n => n.id === networkId);

  // Budget Calculator Logic
  // Assuming a target incentive of $0.10 USD per unique user reached (equivalent to ~500MB of browsing data value).
  const estimatedReach = useMemo(() => {
    if (!budgetNrt || typeof budgetNrt !== 'number') return 0;
    // (Budget in NRT * Price of NRT) / Target Cost per User Reach
    return Math.floor((budgetNrt * settings.nrtUsdValue) / settings.targetReachCostUsd);
  }, [budgetNrt, settings.nrtUsdValue, settings.targetReachCostUsd]);

  const removeLocation = (id: string) => {
    setTargetLocations(targetLocations.filter(l => l.id !== id));
  };

  const isBudgetValid = budgetNrt && typeof budgetNrt === 'number' && budgetNrt <= (balanceNRT || 0) && budgetNrt > 0;
  const canCreate = selectedNetwork && name.trim() && targetLocations.length > 0 && isBudgetValid && startDate && endDate;

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsSubmitting(true);
    
    try {
      await addCampaign({
        networkId,
        name,
        targetLocation: targetLocations,
        budgetNrt: Number(budgetNrt),
        rewardRate: 1 / settings.gbPerNrt, // Dynamic GB per NRT
        startDate,
        endDate,
        isRecurring,
        country: targetLocations[0]?.name?.split(',').pop()?.trim()
      });

      showToast('Campaign successfully launched!', 'success');
      clearCampaignDraft();
      navigate(-1);
    } catch (e: any) {
      showToast(e.message || 'Error launching campaign', 'danger');
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-xl font-bold">New ISP Campaign</h1>
        <div className="w-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-6"
      >
        {/* Network Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Select Verified Network</label>
            {networks.length === 0 ? (
              <div className="p-4 rounded-xl border border-glass-border bg-bg-secondary text-text-secondary text-sm text-center">
                You need to create a Network first before launching a campaign.
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3.5 text-sm text-text-primary flex justify-between items-center transition-colors hover:border-glass-border-hover"
                >
                  {selectedNetwork ? (
                    <span className="font-bold">{selectedNetwork.name}</span>
                  ) : (
                    <span className="text-text-secondary">Choose a network...</span>
                  )}
                  <ChevronDown size={18} className={`text-text-secondary transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showNetworkDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 py-2 bg-bg-secondary border border-glass-border rounded-xl shadow-xl overflow-hidden"
                    >
                      {networks.map(n => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNetworkId(n.id);
                            setShowNetworkDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-glass-bg ${
                            networkId === n.id ? 'bg-accent-primary/10 text-accent-primary font-bold' : 'text-text-primary'
                          }`}
                        >
                          {n.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Campaign Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Free Weekends Promo"
              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        </div>

        {/* Target Location */}
        <div className="glass p-4 rounded-xl border border-glass-border space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-accent-primary" />
            <h3 className="font-bold">Target Location</h3>
          </div>
          
          <button 
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-accent-primary/10 text-accent-primary rounded-xl font-bold border border-accent-primary/20 hover:bg-accent-primary/20 transition-all active:scale-[0.98]"
          >
            <MapPin size={18} /> Open Map to Select Audience
          </button>

          {targetLocations.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {targetLocations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-1.5 bg-bg-secondary border border-glass-border px-3 py-1.5 rounded-full text-xs font-medium">
                  {loc.name.split(',')[0]} <span className="text-accent-primary">(+{loc.radiusKm}km)</span>
                  <button onClick={() => removeLocation(loc.id!)} className="text-text-secondary hover:text-destructive transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Calculator */}
        <div className="glass p-4 rounded-xl border border-glass-border space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Calculator size={100} />
          </div>

          <div className="flex items-center gap-2 mb-1 relative z-10">
            <DollarSign size={16} className="text-accent-primary" />
            <h3 className="font-bold">Budget & Reach</h3>
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Total NRT Budget</label>
              <span className="text-[10px] font-bold text-accent-primary">Available: {balanceNRT.toLocaleString()} NRT</span>
            </div>
            
            <div className="flex gap-2 mb-3">
              {[10, 20, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setBudgetNrt(balanceNRT * (pct / 100))}
                  className="flex-1 bg-bg-secondary hover:bg-glass-border border border-glass-border rounded-lg py-1 text-xs font-bold transition-colors"
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-secondary">NRT</span>
              <input 
                type="number" 
                value={budgetNrt}
                onChange={e => setBudgetNrt(Number(e.target.value) || '')}
                placeholder="0.00"
                className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-14 pr-4 py-3.5 text-lg font-bold text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            {budgetNrt !== '' && budgetNrt > balanceNRT && (
              <p className="text-[10px] text-destructive mt-1 font-bold">Insufficient NRT balance</p>
            )}
            <p className="text-[10px] text-text-secondary mt-2 flex items-center gap-1">
              <Calculator size={12} /> Rate: ~1 NRT per {settings.gbPerNrt}GB Data 
              {budgetNrt && typeof budgetNrt === 'number' && (
                <span className="text-green-500 font-bold ml-1">
                  (≈ {convertNrt(budgetNrt).symbol}{convertNrt(budgetNrt).amount} {selectedCurrency.split(' ')[0]})
                </span>
              )}
            </p>
          </div>

          {budgetNrt && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl p-4 flex justify-between items-center z-10 relative mt-2"
            >
              <div>
                <p className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-1">Est. Users Reached</p>
                <p className="text-2xl font-bold text-text-primary">{estimatedReach.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                <Target size={24} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Schedule */}
        <div className="glass p-4 rounded-xl border border-glass-border space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-accent-primary" />
              <h3 className="font-bold">Schedule</h3>
            </div>
            <button 
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isRecurring ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              <RefreshCw size={12} className={isRecurring ? 'animate-spin-slow' : ''} />
              Recurring
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleCreate}
            disabled={!canCreate || isSubmitting}
            className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-4 rounded-xl shadow-lg transition-all ${
              canCreate && !isSubmitting
                ? 'bg-accent-primary text-primary-foreground shadow-accent-primary/20 active:scale-95' 
                : 'bg-bg-secondary text-text-secondary cursor-not-allowed opacity-50'
            }`}
          >
            {isSubmitting ? 'Launching...' : <>Launch Campaign <ArrowRight size={18} /></>}
          </button>
        </div>
      </motion.div>

      <MapSelectionModal 
        isOpen={isMapOpen} 
        onClose={() => setIsMapOpen(false)} 
        onSave={setTargetLocations} 
        initialLocations={targetLocations} 
      />
    </div>
  );
}
