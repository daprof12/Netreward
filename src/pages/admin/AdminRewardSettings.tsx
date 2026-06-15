import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Settings, DollarSign, Gift, Users, Clock, Info, Activity } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

const CONDITION_LABELS: Record<string, string> = {
  first_reward: 'First Reward Earned',
  signup_only:  'Signup Only',
};

function ReferralTab() {
  const { showToast } = useToastStore();
  const [saving, setSaving] = useState(false);
  const [referralForm, setReferralForm] = useState({
    bonusNrt: 5,
    condition: 'first_reward' as 'first_reward' | 'signup_only',
    maxReferralsPerUser: 0,
    cooldownDays: 0,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('kv_settings')
        .select('value')
        .eq('key', 'referral_config')
        .single();
      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setReferralForm(f => ({ ...f, ...parsed }));
        } catch {}
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('kv_settings').upsert(
        {
          key: 'referral_config',
          value: JSON.stringify(referralForm),
          category: 'rewards',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      showToast('Referral reward settings saved.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewEarnings = referralForm.maxReferralsPerUser > 0
    ? `Up to ${(referralForm.bonusNrt * referralForm.maxReferralsPerUser).toLocaleString()} NRT max per user`
    : 'Unlimited earning potential';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Referral Program</h2>
          <p className="text-sm text-text-secondary">Configure the user referral bonus and payout rules</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Bonus Amount */}
        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass-border pb-3">
            <Gift size={16} className="text-amber-400" />
            <h3 className="font-bold">Bonus Per Referral</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">NRT Amount</label>
            <div className="flex items-center gap-3">
              <input
                id="referral-bonus-nrt"
                type="number"
                min="0"
                step="0.5"
                value={referralForm.bonusNrt}
                onChange={e => setReferralForm(f => ({ ...f, bonusNrt: Number(e.target.value) }))}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
              />
              <span className="text-sm font-bold text-text-secondary">NRT</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Instant wallet credit paid to the referrer when condition is met.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Payout Condition</label>
            <select
              id="referral-condition"
              value={referralForm.condition}
              onChange={e => setReferralForm(f => ({ ...f, condition: e.target.value as any }))}
              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent-primary"
            >
              <option value="first_reward">First Reward Earned (Industry Standard)</option>
              <option value="signup_only">Signup Only</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              {referralForm.condition === 'first_reward'
                ? 'Bonus is paid after the referred user earns their first NRT reward — prevents fraud.'
                : 'Bonus is paid immediately upon signup. Higher fraud risk.'}
            </p>
          </div>

          {/* Live Preview */}
          <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Live Preview</p>
            <p className="text-sm text-text-primary font-bold">You receive <span className="text-amber-400">{referralForm.bonusNrt} NRT</span> instantly in your wallet</p>
            <p className="text-xs text-text-secondary mt-0.5">{previewEarnings}</p>
          </div>
        </div>

        {/* Limits & Controls */}
        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass-border pb-3">
            <Users size={16} className="text-blue-400" />
            <h3 className="font-bold">Limits & Controls</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Max Referrals Per User</label>
            <div className="flex items-center gap-3">
              <input
                id="referral-max-per-user"
                type="number"
                min="0"
                step="1"
                value={referralForm.maxReferralsPerUser}
                onChange={e => setReferralForm(f => ({ ...f, maxReferralsPerUser: Number(e.target.value) }))}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
              />
              <span className="text-sm font-bold text-text-secondary">{referralForm.maxReferralsPerUser === 0 ? 'Unlimited' : 'max'}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Set to 0 for unlimited referrals. Caps the total rewards a single user can earn.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Cooldown Between Payouts (Days)</label>
            <div className="flex items-center gap-3">
              <input
                id="referral-cooldown-days"
                type="number"
                min="0"
                step="1"
                value={referralForm.cooldownDays}
                onChange={e => setReferralForm(f => ({ ...f, cooldownDays: Number(e.target.value) }))}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
              />
              <span className="text-sm font-bold text-text-secondary">{referralForm.cooldownDays === 0 ? 'Off' : 'days'}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">0 = no cooldown. Prevents a single user spamming referrals rapidly.</p>
          </div>

          <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Industry Standard</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Most referral programs use <strong className="text-text-primary">"First Reward Earned"</strong> as the condition
                with no hard cap to maximise organic growth. Cooldowns are optional fraud mitigations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardTab() {
  const { showToast } = useToastStore();
  const [form, setForm] = useState({ gbPerNrt: 1, nrtUsdValue: 0.042, spCashbackPct: 5, ispCashbackPct: 3, targetReachCostUsd: 0.10 });

  useEffect(() => {
    (async () => {
      try {
        const { data: rewards } = await supabase.from('kv_settings').select('value').eq('key', 'reward_config').single();
        const { data: token } = await supabase.from('kv_settings').select('value').eq('key', 'token_config').single();
        
        let initialForm = { gbPerNrt: 1, nrtUsdValue: 0.042, spCashbackPct: 5, ispCashbackPct: 3, targetReachCostUsd: 0.10, instantPurchasePrice: 0.005 };
        
        if (rewards?.value) { 
          try { initialForm = { ...initialForm, ...JSON.parse(rewards.value) }; } catch {} 
        }
        if (token?.value) {
          try { 
            const t = JSON.parse(token.value);
            if (t.currentValue) initialForm.instantPurchasePrice = Number(t.currentValue);
          } catch {}
        }
        
        setForm(initialForm);
      } catch (e) { /* use defaults */ }
    })();
  }, []);

  const handleSave = async () => {
    try {
      // Save Reward Config
      const rewardPayload = { ...form };
      delete (rewardPayload as any).instantPurchasePrice;

      await supabase.from('kv_settings').upsert(
        { key: 'reward_config', value: JSON.stringify(rewardPayload), category: 'rewards', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

      // Save Token Config (for Instant Purchase)
      await supabase.from('kv_settings').upsert(
        { 
          key: 'token_config', 
          value: JSON.stringify({ currentValue: form.instantPurchasePrice, lastUpdate: new Date().toISOString() }), 
          category: 'token', 
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'key' }
      );

      showToast('Reward and Instant Purchase settings updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Reward Settings</h2>
          <p className="text-sm text-text-secondary">Configure global platform reward rates</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity">
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold border-b border-glass-border pb-3">Data to NRT Rate</h3>
          
          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">GB per NRT</label>
            <div className="flex items-center gap-3">
              <input type="number" value={form.gbPerNrt} onChange={e => setForm({ ...form, gbPerNrt: Number(e.target.value) })}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
              <span className="text-sm font-bold text-text-secondary">GB = 1 NRT</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Amount of data consumed to earn 1 NRT.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">NRT Base USD Value (Reference)</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-text-secondary">1 NRT = $</span>
              <input type="number" step="0.001" value={form.nrtUsdValue} onChange={e => setForm({ ...form, nrtUsdValue: Number(e.target.value) })}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
            </div>
            <p className="text-xs text-text-secondary mt-1">Global reference value for earnings display.</p>
          </div>
        </div>

        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold border-b border-glass-border pb-3">Instant Purchase Settlement</h3>
          
          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Instant Purchase Price (USD)</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-text-secondary">1 NRT = $</span>
              <input type="number" step="0.0001" value={(form as any).instantPurchasePrice} onChange={e => setForm({ ...form, instantPurchasePrice: Number(e.target.value) } as any)}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
            </div>
            <p className="text-xs text-text-secondary mt-1">The actual rate used for the user side "Instant Purchase" flow.</p>
          </div>

          <div className="pt-2">
            <div className="bg-accent-primary/5 rounded-lg p-3 border border-accent-primary/10">
              <p className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-1">Live Preview</p>
              <p className="text-sm text-text-primary font-bold">$100.00 USD ≈ {((100 / (form as any).instantPurchasePrice)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NRT</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold border-b border-glass-border pb-3">Cashback / Revenue Share</h3>
          
          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">SP Cashback %</label>
            <div className="flex items-center gap-3">
              <input type="number" value={form.spCashbackPct} onChange={e => setForm({ ...form, spCashbackPct: Number(e.target.value) })}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
              <span className="text-sm font-bold text-text-secondary">%</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Percentage of NRT earned by users returned to SP.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">ISP Cashback %</label>
            <div className="flex items-center gap-3">
              <input type="number" value={form.ispCashbackPct} onChange={e => setForm({ ...form, ispCashbackPct: Number(e.target.value) })}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
              <span className="text-sm font-bold text-text-secondary">%</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Percentage of NRT earned by users returned to ISP.</p>
          </div>
        </div>

        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold border-b border-glass-border pb-3">Network Health Score (NHS)</h3>
          
          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Base NHS Multiplier</label>
            <div className="flex items-center gap-3">
              <input type="number" step="0.1" value={(form as any).nhsMultiplier || 1.0} onChange={e => setForm({ ...form, nhsMultiplier: Number(e.target.value) } as any)}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
              <span className="text-sm font-bold text-text-secondary">x</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Manual scaling factor for global rewards. 1.0 is neutral.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Target NHS Score</label>
            <div className="flex items-center gap-3">
              <input type="number" value={(form as any).targetNhsScore || 65} onChange={e => setForm({ ...form, targetNhsScore: Number(e.target.value) } as any)}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
              <span className="text-sm font-bold text-text-secondary">/ 100</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Desired ecosystem health score. Impacts dynamic inflation.</p>
          </div>

          <div className="pt-2">
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Calculation Logic</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                NRT Earned = (Data GB / Rate) × <span className="text-blue-400 font-bold">{ (form as any).nhsMultiplier || 1.0 }</span>
                <br/>
                <span className="opacity-50">Higher multipliers encourage usage during periods of high demand.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold border-b border-glass-border pb-3">Campaign Reach Strategy</h3>
          
          <div>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Target User Incentive (USD)</label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-text-secondary">$</span>
              <input type="number" step="0.01" value={form.targetReachCostUsd} onChange={e => setForm({ ...form, targetReachCostUsd: Number(e.target.value) })}
                className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
            </div>
            <p className="text-xs text-text-secondary mt-1">Average reward value given to a user to count as 1 "reach".</p>
          </div>

          <div className="pt-2">
            <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Reach Calculation Logic</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Estimated Reach = (Budget NRT × NRT Price) / <span className="text-emerald-400 font-bold">${form.targetReachCostUsd}</span>
                <br/>
                <span className="opacity-50">This helps SPs estimate how many users they can incentivize with their budget.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeesTab() {
  const { showToast } = useToastStore();
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('processing_fees').select('*').order('fee_name');
        setFees((data || []).map((f: any) => ({ ...f, type: f.fee_name, feeType: f.calc_type })));
      } catch (e) { console.error(e); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      for (const f of fees) {
        await supabase.from('processing_fees').update({ calc_type: f.feeType || f.calc_type, value: f.value, updated_at: new Date().toISOString() }).eq('id', f.id);
      }
      showToast('Processing fees updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Processing Fees</h2>
          <p className="text-sm text-text-secondary">Configure flat and percentage-based fees</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity">
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fees.map((fee, i) => (
          <div key={fee.type} className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold border-b border-glass-border pb-3">{fee.type} Fee</h3>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Fee Type</label>
                <select value={fee.feeType} onChange={e => {
                  const newFees = [...fees];
                  newFees[i].feeType = e.target.value as 'flat' | 'percent';
                  setFees(newFees);
                }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm outline-none">
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Rate (NRT)</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Amount / Rate</label>
                <div className="flex items-center gap-3">
                  <input type="number" step={fee.feeType === 'percent' ? '0.1' : '1'} value={fee.value} onChange={e => {
                    const newFees = [...fees];
                    newFees[i].value = Number(e.target.value);
                    setFees(newFees);
                  }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                  <span className="font-bold text-text-secondary text-sm">{fee.feeType === 'percent' ? '%' : 'NRT'}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-secondary">Applied automatically to all {fee.type.toLowerCase()} transactions.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryLimitsTab() {
  const { showToast } = useToastStore();
  const [saving, setSaving] = useState(false);
  const [limits, setLimits] = useState({
    default: 100, // MB/s
    cloud: 50,
    streaming: 10,
    social: 8,
    ai: 5,
    browsing: 4,
    gaming: 0.25,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('kv_settings').select('value').eq('key', 'category_bandwidth_limits').single();
      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setLimits(l => ({ ...l, ...parsed }));
        } catch {}
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('kv_settings').upsert(
        {
          key: 'category_bandwidth_limits',
          value: JSON.stringify(limits),
          category: 'rewards',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      showToast('Category limits saved.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const InputRow = ({ label, field, desc }: { label: string, field: keyof typeof limits, desc: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-glass-border last:border-0">
      <div className="flex-1">
        <p className="font-bold text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-48 shrink-0">
        <input
          type="number"
          step="0.01"
          min="0"
          value={limits[field]}
          onChange={e => setLimits(l => ({ ...l, [field]: Number(e.target.value) }))}
          className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-primary"
        />
        <span className="text-xs font-bold text-text-secondary whitespace-nowrap">MB/s</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Category Bandwidth Limits</h2>
          <p className="text-sm text-text-secondary">Configure max data speeds per category for fraud detection</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-2">
        <InputRow label="Absolute Limit (Default)" field="default" desc="Fallback limit applied to any category not explicitly defined." />
        <InputRow label="Cloud" field="cloud" desc="Cloud syncs and backups can fully saturate connections." />
        <InputRow label="Streaming" field="streaming" desc="4K video streaming peaks, including pre-buffering bursts." />
        <InputRow label="Social" field="social" desc="Infinite scrolling platforms with heavy image/video content." />
        <InputRow label="AI / AI Service" field="ai" desc="Receiving streams of generated content or heavy AI model responses." />
        <InputRow label="Browsing / Ecommerce" field="browsing" desc="Standard web page assets, images, and scripts." />
        <InputRow label="Gaming" field="gaming" desc="Multiplayer games use very low continuous bandwidth (0.25 MB/s = 250 KB/s)." />
      </div>
      
      <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10 flex gap-2 mt-4">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">How it works</p>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            The telemetry engine divides the reported bytes by the session duration to get the average speed.
            If the average speed exceeds these limits, the session is flagged as an anomaly (`HIGH_VOLUME`), reducing its validation score.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminRewardSettings() {
  usePageTitle('Admin — Rewards');
  const [activeTab, setActiveTab] = useState<'rewards' | 'referral' | 'fees' | 'limits'>('rewards');

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Rewards & Fees</h1>
        <p className="text-sm text-text-secondary">Manage global reward settings, referral bonuses, and processing fees</p>
      </div>

      <div className="flex bg-bg-secondary p-1 rounded-xl w-fit gap-1">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'rewards' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Settings size={16} /> Rewards
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'referral' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Gift size={16} /> Referral
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'fees' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <DollarSign size={16} /> Fees
        </button>
        <button
          onClick={() => setActiveTab('limits')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'limits' ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Activity size={16} /> Limits
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'rewards'  && <RewardTab />}
          {activeTab === 'referral' && <ReferralTab />}
          {activeTab === 'fees'     && <FeesTab />}
          {activeTab === 'limits'   && <CategoryLimitsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
