/**
 * formatNrt.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart NRT amount formatter that prevents micro-values (e.g. 0.00000000089)
 * from distorting UI layouts.
 *
 * STRATEGY
 * ─────────
 * • value ≥ 1 000     → "1,234.56"          (comma-separated, 2 dp)
 * • value ≥ 1         → "5.00"              (2 dp)
 * • value ≥ 0.01      → "0.0042"            (4 dp, short enough for UI)
 * • value ≥ 0.001     → "0.0010"
 * • value < 0.001     → COMPACT subscript   { prefix:"0.0", zeros:2, sig:"44" }
 *   rendered as: 0.0₈89  (subscript zero-count, plain suffix)
 *
 * The actual stored value is NEVER rounded — only the display is affected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type NrtFormatResult =
  | { type: 'plain'; text: string }
  | { type: 'subscript'; prefix: string; zeros: number; suffix: string };

/**
 * Format a raw NRT amount into a display-safe result.
 *
 * @param value   The raw numeric NRT value (or string representation)
 * @param sign    Whether to prepend '+' for positive values (default: false)
 */
export function formatNrt(
  value: number | string | null | undefined,
  { showSign = false }: { showSign?: boolean } = {},
): NrtFormatResult {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);

  if (isNaN(num)) return { type: 'plain', text: '0' };
  if (num === 0)  return { type: 'plain', text: '0' };

  let abs  = Math.abs(num);
  const sign = num < 0 ? '-' : showSign && num > 0 ? '+' : '';

  // ── Compact subscript range (< 0.001) ─────────────────────────────────────
  if (abs > 0 && abs < 0.001) {
    // Determine how many leading zeros the raw absolute value has
    const initialRaw = abs.toFixed(18);
    const initialAfterDot = initialRaw.split('.')[1] || '';
    let initialLeadingZeros = 0;
    for (const ch of initialAfterDot) {
      if (ch === '0') initialLeadingZeros++;
      else break;
    }

    // Round up to the nearest 3 digits after the leading zeros
    const decimals = Math.min(18, initialLeadingZeros + 3);
    const factor = Math.pow(10, decimals);
    const roundedAbs = Math.ceil(abs * factor) / factor;

    if (roundedAbs < 0.001) {
      // Show capped precision for micro amounts without trailing zeros
      const raw         = roundedAbs.toFixed(18).replace(/0+$/, ''); 
      if (raw === '0' || raw === '0.') return { type: 'plain', text: sign + '0' };

      const afterDot    = raw.split('.')[1] ?? '';

      // Count leading zeros again (rounding may have shifted it)
      let leadingZeros  = 0;
      for (const ch of afterDot) {
        if (ch === '0') leadingZeros++;
        else break;
      }

      // Extract significant digits
      const sigStart = leadingZeros;
      const sig      = afterDot.slice(sigStart) || '0';

      // "0.0" already shows one zero; subscript shows how many MORE zeros follow
      const subscriptZeros = leadingZeros - 1;

      return {
        type:   'subscript',
        prefix: sign + '0.0',
        zeros:  subscriptZeros,
        suffix: sig,
      };
    } else {
      // Rounding pushed the value to ≥ 0.001, so let it fall through to normal formatting
      abs = roundedAbs;
    }
  }

  // ── Normal range (≥ 0.0001) ───────────────────────────────────────────────
  // Show digits capped at 6 decimal places per user request
  const text = abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

  return {
    type: 'plain',
    text: sign + text,
  };
}

/**
 * Plain-text version — useful for toasts, console logs, input placeholders.
 * Renders compact form as  "0.0[8]89"  (bracket notation, no real subscript).
 */
const subscriptMap = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
function toSubscript(num: number): string {
  return num.toString().split('').map(d => subscriptMap[parseInt(d)]).join('');
}

export function formatNrtText(
  value: number | string | null | undefined,
  opts: { showSign?: boolean } = {},
): string {
  const r = formatNrt(value, opts);
  if (r.type === 'plain') return r.text;
  return `${r.prefix}${toSubscript(r.zeros)}${r.suffix}`;
}
