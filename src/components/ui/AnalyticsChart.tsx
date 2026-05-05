import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AnalyticsChartProps {
  data: ChartData[];
  type?: 'area' | 'bar';
  color?: string;
  yAxisFormatter?: (val: number) => string;
  tooltipFormatter?: (val: number) => string;
  height?: number;
  dataKey?: string;
}

export default function AnalyticsChart({ 
  data, 
  type = 'area', 
  color = 'var(--accent-primary)', 
  yAxisFormatter,
  tooltipFormatter,
  height = 200,
  dataKey = 'value'
}: AnalyticsChartProps) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-xl border border-glass-border shadow-2xl bg-bg-card/90 backdrop-blur-md">
          <p className="text-[10px] font-black text-text-secondary uppercase mb-1">{label}</p>
          <p className="text-sm font-bold text-text-primary">
            {tooltipFormatter ? tooltipFormatter(payload[0].value) : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3} 
              fillOpacity={1} 
              fill={`url(#gradient-${color})`}
              animationDuration={1500}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--glass-bg)', opacity: 0.1 }} />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
