import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
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

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return { dataset1: [], dataset2: [], dataset3: [], maxValue: 100 };
    
    // For single series or BarChart
    const dataset1 = data.map(item => ({
      value: Number(item[series[0]?.key]) || 0,
      label: String(item[xKey] || ''),
      labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
      frontColor: series[0]?.color || colors.accentPrimary,
    }));

    // For multi-series LineChart
    const dataset2 = series.length > 1 ? data.map(item => ({
      value: Number(item[series[1]?.key]) || 0,
      label: String(item[xKey] || ''),
    })) : [];

    const dataset3 = series.length > 2 ? data.map(item => ({
      value: Number(item[series[2]?.key]) || 0,
      label: String(item[xKey] || ''),
    })) : [];

    // Find max value to give headroom
    let maxValue = 0;
    data.forEach(item => {
      series.forEach(s => {
        const val = Number(item[s.key]) || 0;
        if (val > maxValue) maxValue = val;
      });
    });

    return { dataset1, dataset2, dataset3, maxValue: Math.max(10, maxValue * 1.2) };
  }, [data, xKey, series, colors]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={{ color: colors.textSecondary }}>No data</Text>
      </View>
    );
  }

  const { dataset1, dataset2, dataset3, maxValue } = formattedData;

  const yAxisProps = {
    maxValue,
    noOfSections: 4,
    yAxisLabelTexts: [0, 1, 2, 3, 4].map(i => {
      const val = (maxValue / 4) * i;
      return val >= 1000 ? `${(val/1000).toFixed(0)}k` : val >= 1 ? val.toFixed(1) : val.toFixed(2);
    }),
    yAxisTextStyle: { color: colors.textSecondary, fontSize: 10 },
    yAxisThickness: 0,
    xAxisThickness: 0,
    rulesType: 'dashed' as const,
    rulesColor: colors.glassBorder,
    hideRules: false,
    hideYAxisText: false,
    yAxisTextNumberOfLines: 1,
    yAxisLabelWidth: 40,
  };

  const pointerConfig = {
    pointerStripUptoDataPoint: true,
    pointerStripColor: colors.glassBorder,
    pointerStripWidth: 2,
    pointerColor: colors.textPrimary,
    radius: 4,
    pointerLabelWidth: 120,
    pointerLabelHeight: 60,
    activatePointersOnLongPress: false,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any) => {
      if (!items || !items[0]) return null;
      const item = items[0];
      return (
        <View style={[styles.tooltip, { backgroundColor: colors.bgPrimary, borderColor: colors.glassBorder }]}>
          <Text style={[styles.tooltipLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          {items.map((it: any, index: number) => {
            if (!it) return null;
            const ser = series[index];
            if (!ser) return null;
            const v = it.value;
            const formatted = v >= 1 ? v.toFixed(2) : v >= 0.001 ? v.toFixed(4) : v.toFixed(6);
            return (
              <Text key={index} style={[styles.tooltipValue, { color: ser.color }]}>
                {ser.name || ser.key}: {formatted}
              </Text>
            );
          })}
        </View>
      );
    },
  };

  if (type === 'bar') {
    return (
      <View style={{ height, width: '100%', overflow: 'hidden' }}>
        <BarChart
          data={dataset1}
          height={height - 40}
          barWidth={20}
          spacing={20}
          initialSpacing={10}
          frontColor={series[0]?.color || colors.accentPrimary}
          {...yAxisProps}
        />
      </View>
    );
  }

  // Area / Line chart
  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <LineChart
        data={dataset1}
        data2={series.length > 1 ? dataset2 : undefined}
        data3={series.length > 2 ? dataset3 : undefined}
        height={height - 40}
        initialSpacing={10}
        spacing={Math.max(30, 250 / Math.max(1, data.length))}
        color1={series[0]?.color}
        color2={series[1]?.color}
        color3={series[2]?.color}
        textColor1={series[0]?.color}
        hideDataPoints={true}
        areaChart
        startFillColor1={series[0]?.color}
        endFillColor1={series[0]?.color}
        startOpacity1={0.3}
        endOpacity1={0.0}
        startFillColor2={series[1]?.color}
        endFillColor2={series[1]?.color}
        startOpacity2={0.3}
        endOpacity2={0.0}
        curved
        isAnimated={true}
        animationDuration={800}
        pointerConfig={pointerConfig}
        {...yAxisProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  tooltip: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  tooltipLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
