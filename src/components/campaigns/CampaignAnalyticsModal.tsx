import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, Laptop, Smartphone, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import NrtAmount from '@/components/ui/NrtAmount';

// We use any for campaign here to support both SP and ISP campaign types loosely
export default function CampaignAnalyticsModal({ campaign, onClose }: { campaign: any; onClose: () => void }) {
  const { data: analytics, isLoading } = useCampaignAnalytics(campaign.id);
  const [search, setSearch] = useState('');

  const filtered = (analytics?.participants || []).filter(p => 
    p.email.toLowerCase().includes(search.toLowerCase()) || 
    p.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col items-center bg-bg-primary pt-safe overflow-y-auto"
    >
      <div className="w-full max-w-md flex flex-col flex-1 min-h-screen">
        <div className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{campaign.name || campaign.title}</h1>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Growth Chart */}
          <div className="glass p-4 rounded-2xl border border-glass-border">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-primary" />
              Performance (Last 7 Days)
            </h4>
            <div className="h-48 w-full min-h-[200px]">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-accent-primary" size={24} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.chartData}>
                    <defs>
                      <linearGradient id="colorNrt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        borderColor: 'var(--glass-border)',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="nrt" 
                      stroke="var(--accent-primary)" 
                      fillOpacity={1} 
                      fill="url(#colorNrt)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[10px] text-text-secondary text-center mt-2 italic">
              Daily NRT rewards distributed to participants
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-2xl border border-glass-border">
              <p className="text-xs text-text-secondary font-medium">Started</p>
              <h3 className="text-sm font-bold text-text-primary mt-1">{new Date(campaign.startDate || campaign.created_at).toLocaleDateString()}</h3>
            </div>
            <div className="glass p-4 rounded-2xl border border-glass-border">
              <p className="text-xs text-text-secondary font-medium">Users Reached</p>
              <h3 className="text-sm font-bold text-text-primary mt-1">{isLoading ? '...' : analytics?.totalUsers}</h3>
            </div>
          </div>

          <h3 className="font-semibold text-lg">Active Earning Devices</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search by email or location..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm" 
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-accent-primary" size={32} />
              <p className="text-sm text-text-secondary">Loading participants...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-text-secondary text-sm">
              No active participants found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u, i) => (
                <div key={i} className="glass p-4 rounded-xl border border-glass-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                      {u.device_type === 'laptop' || u.device_type === 'desktop' ? <Laptop size={20} /> : <Smartphone size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm truncate max-w-[150px]">
                        {u.email}
                      </p>
                      <p className="text-[10px] text-text-secondary uppercase font-bold">{u.device_name} • {u.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent-primary text-sm">+<NrtAmount value={u.nrt_earned} /></p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${u.status === 'active' ? 'text-green-500' : 'text-text-secondary'}`}>{u.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
