import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

interface Fee {
  id: string;
  fee_name: string;
  calc_type: 'flat' | 'percent';
  value: number;
  is_active: boolean;
}

export default function AdminFees() {
  const { showToast } = useToastStore();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processing_fees')
        .select('*')
        .order('fee_name');
      if (error) throw error;
      setFees(data || []);
    } catch (e: any) { console.error('Fetch fees:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const f of fees) {
        const { error } = await supabase
          .from('processing_fees')
          .update({ calc_type: f.calc_type, value: f.value, updated_at: new Date().toISOString() })
          .eq('id', f.id);
        if (error) throw error;
      }
      showToast('Processing fees updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-accent-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Processing Fees</h1>
          <p className="text-sm text-text-secondary">Configure flat and percentage-based fees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-bg-secondary border border-glass-border rounded-xl hover:bg-glass-bg transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fees.map((fee, i) => (
          <div key={fee.id} className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold border-b border-glass-border pb-3">{fee.fee_name} Fee</h3>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Fee Type</label>
                <select value={fee.calc_type} onChange={e => {
                  const newFees = [...fees];
                  newFees[i] = { ...newFees[i], calc_type: e.target.value as 'flat' | 'percent' };
                  setFees(newFees);
                }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm outline-none">
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Rate (NRT)</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Amount / Rate</label>
                <div className="flex items-center gap-3">
                  <input type="number" step={fee.calc_type === 'percent' ? '0.1' : '1'} value={fee.value} onChange={e => {
                    const newFees = [...fees];
                    newFees[i] = { ...newFees[i], value: Number(e.target.value) };
                    setFees(newFees);
                  }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                  <span className="font-bold text-text-secondary text-sm">{fee.calc_type === 'percent' ? '%' : 'NRT'}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-secondary">Applied automatically to all {fee.fee_name.toLowerCase()} transactions.</p>
          </div>
        ))}
      </div>

      {fees.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          No processing fees configured. Run the admin migration to seed defaults.
        </div>
      )}
    </motion.div>
  );
}
