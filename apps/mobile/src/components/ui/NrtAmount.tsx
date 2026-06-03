import React from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { formatNrt } from '@/lib/formatNrt';

interface NrtAmountProps {
  value: any;
  showSign?: boolean;
  hideUnit?: boolean;
  style?: StyleProp<TextStyle>;
  unitStyle?: StyleProp<TextStyle>;
}

const subscriptMap = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
function toSubscript(num: number): string {
  return num.toString().split('').map(d => subscriptMap[parseInt(d)]).join('');
}

export default function NrtAmount({ value, showSign = false, hideUnit = false, style, unitStyle }: NrtAmountProps) {
  const result = formatNrt(value, { showSign });
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const baseFontSize = (flattenedStyle as any).fontSize || 14;

  const unitLabel = hideUnit ? null : (
    <Text style={[style, styles.unit, unitStyle]}>NRT</Text>
  );

  if (result.type === 'plain') {
    return (
      <View style={styles.container}>
        <Text style={style}>{result.text}</Text>
        {unitLabel}
      </View>
    );
  }

  // result.type === 'subscript'
  return (
    <View style={styles.container}>
      <Text style={style}>{result.prefix}{toSubscript(result.zeros)}{result.suffix}</Text>
      {unitLabel}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'baseline' },
  unit: { fontSize: 12, opacity: 0.7, marginLeft: 4, fontWeight: 'bold' },
  subscript: { fontSize: 10, opacity: 0.8, marginTop: 4 } // Adjust font size for subscript look
});
