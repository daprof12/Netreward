import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColors } from '@/theme';

interface ChartSeries {
  key: string;
  color: string;
  name?: string;
}

interface WebViewChartProps {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  type?: 'area' | 'bar';
}

export default function WebViewChart({ 
  data, 
  xKey, 
  series,
  height = 180,
  type = 'area'
}: WebViewChartProps) {
  const colors = useThemeColors();

  // Load React, ReactDOM, Recharts, and Babel via CDN
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            background-color: ${colors.bgSecondary}; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          #root { width: 100%; height: ${height}px; }
        </style>
        <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/prop-types/prop-types.min.js"></script>
        <script src="https://unpkg.com/recharts/umd/Recharts.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          const { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = window.Recharts;
          
          const data = ${JSON.stringify(data)};
          const series = ${JSON.stringify(series)};
          const colors = {
            bgPrimary: '${colors.bgPrimary}',
            glassBorder: '${colors.glassBorder}',
            textPrimary: '${colors.textPrimary}',
            textSecondary: '${colors.textSecondary}'
          };

          const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div style={{
                  backgroundColor: colors.bgPrimary,
                  border: '1px solid ' + colors.glassBorder,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontWeight: 'bold' }}>{label}</p>
                  {payload.map((entry, index) => (
                    <p key={index} style={{ margin: '2px 0 0 0', color: entry.color, fontWeight: 'bold' }}>
                      {entry.name}: {entry.value}
                    </p>
                  ))}
                </div>
              );
            }
            return null;
          };

          const ChartComponent = () => {
            return (
              <ResponsiveContainer width="100%" height="100%">
                ${type === 'area' ? `
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {series.map((s, i) => (
                        <linearGradient key={i} id={"colorGradient" + i} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.glassBorder} vertical={false} />
                    <XAxis 
                      dataKey="${xKey}" 
                      stroke={colors.textSecondary} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke={colors.textSecondary} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => value >= 1000 ? (value / 1000) + 'k' : value}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: colors.glassBorder, strokeWidth: 1, strokeDasharray: '4 4' }} />
                    {series.map((s, i) => (
                      <Area 
                        key={i}
                        type="monotone" 
                        dataKey={s.key} 
                        name={s.name || s.key}
                        stroke={s.color} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill={"url(#colorGradient" + i + ")"} 
                      />
                    ))}
                  </AreaChart>
                ` : `
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.glassBorder} vertical={false} />
                    <XAxis 
                      dataKey="${xKey}" 
                      stroke={colors.textSecondary} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke={colors.textSecondary} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => value >= 1000 ? (value / 1000) + 'k' : value}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    {series.map((s, i) => (
                      <Bar 
                        key={i}
                        dataKey={s.key} 
                        name={s.name || s.key}
                        fill={s.color} 
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                `}
              </ResponsiveContainer>
            );
          }

          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<ChartComponent />);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', borderRadius: 12 }, styles.container]}>
      <WebView
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {}
});
