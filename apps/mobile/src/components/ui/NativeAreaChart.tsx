import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useThemeColors } from '@/theme';

interface ChartSeries {
  key: string;
  color: string;
  name?: string;
}

interface NativeChartProps {
  data: any[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  width?: number;
}

export default function NativeAreaChart({
  data,
  xKey,
  series,
  height = 180,
  width = 340,
}: NativeChartProps) {
  const colors = useThemeColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No data</Text>
      </View>
    );
  }

  const pad = { top: 12, right: 12, bottom: 28, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // Compute Y range
  let yMax = 0;
  series.forEach((s) => {
    data.forEach((d) => {
      const v = Number(d[s.key]) || 0;
      if (v > yMax) yMax = v;
    });
  });
  if (yMax === 0) yMax = 1;
  yMax = yMax * 1.1;

  // Nice tick values
  function niceNum(range: number, round: boolean) {
    const exp = Math.floor(Math.log10(range));
    const frac = range / Math.pow(10, exp);
    let nice;
    if (round) {
      if (frac < 1.5) nice = 1;
      else if (frac < 3) nice = 2;
      else if (frac < 7) nice = 5;
      else nice = 10;
    } else {
      if (frac <= 1) nice = 1;
      else if (frac <= 2) nice = 2;
      else if (frac <= 5) nice = 5;
      else nice = 10;
    }
    return nice * Math.pow(10, exp);
  }

  const tickCount = 5;
  const rawStep = yMax / (tickCount - 1);
  const step = rawStep > 0 ? niceNum(rawStep, true) : 1;
  const niceYMax = Math.ceil(yMax / step) * step || step;
  const yTicks: number[] = [];
  for (let t = 0; t <= niceYMax; t += step) yTicks.push(t);

  const yScale = (v: number) => pad.top + plotH - (v / niceYMax) * plotH;
  const xScale = (i: number) => pad.left + (i / (data.length - 1 || 1)) * plotW;

  // Format tick labels
  const formatTick = (v: number) => {
    if (v === 0) return '0';
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    if (v >= 1) return v.toFixed(1);
    if (v >= 0.01) return v.toFixed(2);
    return v.toFixed(4);
  };

  // Build paths for each series
  const paths = series.map((s) => {
    let linePath = '';
    let areaPath = '';

    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(Number(d[s.key]) || 0);
      if (i === 0) {
        linePath += `M${x},${y}`;
        areaPath += `M${x},${y}`;
      } else {
        const px = xScale(i - 1);
        const py = yScale(Number(data[i - 1][s.key]) || 0);
        const cx = (px + x) / 2;
        linePath += ` C${cx},${py} ${cx},${y} ${x},${y}`;
        areaPath += ` C${cx},${py} ${cx},${y} ${x},${y}`;
      }
    });

    const lastX = xScale(data.length - 1);
    const firstX = xScale(0);
    const baseY = yScale(0);
    areaPath += ` L${lastX},${baseY} L${firstX},${baseY} Z`;

    return { linePath, areaPath, color: s.color };
  });

  // X labels — show ~6 evenly spaced
  const xLabelCount = Math.min(data.length, 6);
  const xLabelStep = Math.max(1, Math.floor((data.length - 1) / (xLabelCount - 1)));
  const xLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += xLabelStep) {
    xLabels.push({ x: xScale(i), label: data[i][xKey] || '' });
  }
  if ((data.length - 1) % xLabelStep !== 0 && data.length > 1) {
    xLabels.push({ x: xScale(data.length - 1), label: data[data.length - 1][xKey] || '' });
  }

  // Find last non-zero data point for the active dot
  let lastNonZeroIdx = -1;
  const firstSeries = series[0];
  for (let i = data.length - 1; i >= 0; i--) {
    if (Number(data[i][firstSeries.key]) > 0) {
      lastNonZeroIdx = i;
      break;
    }
  }

  return (
    <View style={{ height, width: '100%' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {paths.map((p, i) => (
            <LinearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={p.color} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={p.color} stopOpacity={0.02} />
            </LinearGradient>
          ))}
        </Defs>

        {/* Grid lines */}
        {yTicks.map((tv, i) => {
          const y = yScale(tv);
          return (
            <Line
              key={`grid-${i}`}
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke={colors.glassBorder}
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Y axis labels */}
        {yTicks.map((tv, i) => {
          const y = yScale(tv);
          return (
            <SvgText
              key={`ytick-${i}`}
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              fill={colors.textSecondary}
              fontSize={10}
            >
              {formatTick(tv)}
            </SvgText>
          );
        })}

        {/* X axis labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={`xtick-${i}`}
            x={l.x}
            y={height - 6}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize={10}
          >
            {l.label}
          </SvgText>
        ))}

        {/* Area fills and lines */}
        {paths.map((p, i) => (
          <React.Fragment key={`path-${i}`}>
            <Path d={p.areaPath} fill={`url(#grad${i})`} />
            <Path d={p.linePath} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </React.Fragment>
        ))}

        {/* Active dot on last non-zero point */}
        {lastNonZeroIdx >= 0 && (
          <Circle
            cx={xScale(lastNonZeroIdx)}
            cy={yScale(Number(data[lastNonZeroIdx][firstSeries.key]) || 0)}
            r={4}
            fill={colors.bgPrimary}
            stroke={firstSeries.color}
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
