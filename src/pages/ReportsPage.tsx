import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Filter, Calendar, PieChart, ArrowRight, CheckCircle2, Loader2, DollarSign, Percent, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Report {
  id: string;
  report_type: string;
  format: string;
  status: string;
  download_url: string | null;
  metadata: any;
  created_at: string;
}

export default function ReportsPage() {
  usePageTitle('Reports');
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { showToast } = useToastStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taxRate, setTaxRate] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    fetchTaxRate();
  }, [profile?.country]);

  async function fetchReports() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('financial_reports')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function fetchTaxRate() {
    if (!profile?.country) return;
    const { data } = await supabase
      .from('country_tax_rates')
      .select('*')
      .eq('country_code', profile.country.toUpperCase())
      .single();
    setTaxRate(data);
  }

  const handleGenerateReport = async (type: string) => {
    setIsGenerating(true);
    try {
      // Fetch real earnings/spending totals from transactions table
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: txData } = await supabase
        .from('transactions')
        .select('tx_type, amount')
        .eq('user_id', profile?.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const totalEarnings = (txData || [])
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalWithdrawals = (txData || [])
        .filter(t => t.tx_type === 'withdrawal')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      const reportTotal = type === 'earnings' ? totalEarnings : type === 'withdrawals' ? totalWithdrawals : totalEarnings;
      const taxPct = taxRate?.tax_percentage || 0;

      const reportMetadata = {
        date_range: `${new Date(startOfMonth).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${new Date(endOfMonth).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
        tax_applied: taxPct,
        tax_label: taxRate?.tax_label || 'VAT',
        total_earnings: Number(reportTotal.toFixed(4)),
        net_after_tax: Number((reportTotal * (1 - taxPct / 100)).toFixed(4)),
        total_transactions: (txData || []).length,
      };

      const { error } = await supabase.from('financial_reports').insert({
        user_id: profile?.id,
        report_type: type,
        format: 'csv',
        status: 'completed',
        metadata: reportMetadata,
        download_url: '#' // Actual CSV generation can be done via Edge Function
      });

      if (error) throw error;
      showToast(`${type.replace('_', ' ')} report generated successfully`, 'success');
      fetchReports();
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportIcons: Record<string, any> = {
    earnings: DollarSign,
    campaign_roi: PieChart,
    tax_summary: Percent
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-4 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black">Financial Reports</h1>
          <p className="text-sm text-text-secondary">Export your earnings and performance data</p>
        </div>
      </div>

      {/* Tax Info Card */}
      <div className="glass p-4 rounded-2xl border border-glass-border bg-accent-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Percent size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase">Local Tax Configuration</p>
            <p className="text-sm font-semibold">
              {taxRate ? `${taxRate.tax_label}: ${taxRate.tax_percentage}% (${profile?.country})` : `No specific tax rate found for ${profile?.country || 'your country'}`}
            </p>
          </div>
        </div>
        <Link to="/settings" className="text-xs text-accent-primary font-bold hover:underline">Change Country</Link>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { id: 'earnings', title: 'Earnings History', desc: 'Detailed breakdown of all NRT earned.', icon: DollarSign },
          { id: 'tax_summary', title: 'Tax Liability', desc: 'Summary of taxes for the current period.', icon: Percent },
          { id: 'campaign_roi', title: 'Performance Audit', desc: 'Campaign efficiency and ROI metrics.', icon: PieChart, hidden: profile?.role === 'user' },
        ].filter(r => !r.hidden).map(rpt => (
          <div key={rpt.id} className="bg-bg-card border border-glass-border rounded-2xl p-5 flex items-center gap-4 hover:border-accent-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-accent-primary shrink-0">
              <rpt.icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-text-primary">{rpt.title}</h3>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{rpt.desc}</p>
            </div>
            <button 
              disabled={isGenerating}
              onClick={() => handleGenerateReport(rpt.id)}
              className="shrink-0 px-4 py-2.5 bg-accent-primary text-white font-bold rounded-xl text-xs shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <><Download size={14} /> CSV</>}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Recent Downloads</h3>
        <div className="space-y-3">
          {reports.map(report => {
            const Icon = reportIcons[report.report_type] || FileText;
            return (
              <div key={report.id} className="glass p-4 rounded-xl border border-glass-border flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:text-accent-primary transition-colors">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm capitalize">{report.report_type.replace('_', ' ')}</h4>
                    <p className="text-[10px] text-text-secondary">
                      {new Date(report.created_at).toLocaleDateString()} &bull; {report.metadata?.date_range}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                     <p className="text-[10px] font-bold text-text-secondary uppercase">Tax Rate</p>
                     <p className="text-xs font-black">{report.metadata?.tax_applied}% {report.metadata?.tax_label}</p>
                  </div>
                  <a href={report.download_url || '#'} className="p-2 bg-bg-secondary hover:bg-accent-primary hover:text-white rounded-lg transition-all">
                    <Download size={16} />
                  </a>
                </div>
              </div>
            );
          })}
          {reports.length === 0 && (
            <div className="text-center py-12 text-text-secondary glass rounded-2xl border border-dashed border-glass-border">
              No reports generated yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

