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
 * • value ≥ 0.001     → "0.0042"            (4 dp, short enough for UI)
 * • value ≥ 0.0001    → "0.000089"          (6 dp, still reasonable)
 * • value < 0.0001    → COMPACT subscript   { prefix:"0.0", zeros:8, sig:"89" }
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

  const abs  = Math.abs(num);
  const sign = num < 0 ? '-' : showSign && num > 0 ? '+' : '';

  // ── Compact subscript range (< 0.0001) ─────────────────────────────────────
  if (abs > 0 && abs < 0.0001) {
    // Use toFixed(6) to adhere to platform-wide max 6 decimal place rule
    const raw         = abs.toFixed(6).replace(/0+$/, ''); 
    if (raw === '0' || raw === '0.') return { type: 'plain', text: sign + '0' };

    const afterDot    = raw.split('.')[1] ?? '';

    // Count leading zeros before first non-zero digit
    let leadingZeros  = 0;
    for (const ch of afterDot) {
      if (ch === '0') leadingZeros++;
      else break;
    }

    // Extract significant digits (capped by the .toFixed(6) above)
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
export function formatNrtText(
  value: number | string | null | undefined,
  opts: { showSign?: boolean } = {},
): string {
  const r = formatNrt(value, opts);
  if (r.type === 'plain') return r.text;
  return `${r.prefix}[${r.zeros}]${r.suffix}`;
}
