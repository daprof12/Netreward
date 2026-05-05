import { motion } from 'framer-motion';
import { Activity, Database, Server, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const latencyData = [
  { time: '10:00', ms: 45 }, { time: '10:05', ms: 52 }, { time: '10:10', ms: 48 },
  { time: '10:15', ms: 61 }, { time: '10:20', ms: 55 }, { time: '10:25', ms: 50 },
  { time: '10:30', ms: 47 },
];

export default function AdminSystemHealth() {
  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">System Health</h1>
        <p className="text-sm text-text-secondary">Monitor platform performance and uptime</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Global Uptime', value: '99.99%', icon: Activity, color: '#10B981' },
          { label: 'API Latency', value: '47ms', icon: Server, color: '#3B82F6' },
          { label: 'Database Load', value: '12%', icon: Database, color: '#6366f1' },
          { label: 'CPU Usage', value: '34%', icon: Cpu, color: '#F59E0B' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-bg-card border border-glass-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20`, color }}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium mb-0.5">{label}</p>
              <h3 className="text-xl font-black text-text-primary leading-none">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl p-5">
        <h3 className="font-bold mb-4">API Latency (Last 30 Mins)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)' }} />
              <Line type="monotone" dataKey="ms" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
