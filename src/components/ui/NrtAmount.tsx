/**
 * NrtAmount.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * React component that renders NRT values with compact subscript notation for
 * very small numbers, preserving UI layout integrity.
 *
 * Usage:
 *   <NrtAmount value={tx.amount} showSign />        → "+0.0₈89 NRT"
 *   <NrtAmount value={balance} className="text-4xl" />
 *   <NrtAmount value={5.25} hideUnit />              → "5.25"
 *
 * The subscript zero-count is rendered as a bottom-aligned small digit using
 * the CSS `sub` element styled to match the surrounding text scale — it does
 * NOT shift baseline (unlike a raw <sub>), so it never breaks line-height.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { formatNrt } from '@/lib/formatNrt';

interface NrtAmountProps {
  /** Raw NRT value — any precision, never rounded */
  value: number | string | null | undefined;
  /** Prepend '+' for positive values */
  showSign?: boolean;
  /** Hide the "NRT" unit label */
  hideUnit?: boolean;
  /** Extra className applied to the root <span> */
  className?: string;
  /** className for the "NRT" unit text (default: smaller + muted) */
  unitClassName?: string;
}

/**
 * Renders a subscript zero-count indicator.
 * Visually: the digit sits at the bottom of the number line,
 * using font-size ~60% and vertical-align: sub, but we override
 * the default browser sub behaviour to avoid layout shift.
 */
function SubZeros({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} zeros`}
      style={{
        fontSize: '0.6em',
        verticalAlign: 'sub',
        lineHeight: 1,
        fontWeight: 'inherit',
        letterSpacing: 0,
      }}
    >
      {count}
    </span>
  );
}

export default function NrtAmount({
  value,
  showSign = false,
  hideUnit = false,
  className = '',
  unitClassName = 'text-[0.6em] ml-1 opacity-70 font-bold',
}: NrtAmountProps) {
  const result = formatNrt(value, { showSign });

  const unitLabel = hideUnit ? null : (
    <span className={unitClassName}>NRT</span>
  );

  if (result.type === 'plain') {
    return (
      <span className={className}>
        {result.text}
        {unitLabel}
      </span>
    );
  }

  // Subscript compact form: prefix + subscript-zeros + suffix
  return (
    <span className={className} title={`${value} NRT`}>
      {result.prefix}
      <SubZeros count={result.zeros} />
      {result.suffix}
      {unitLabel}
    </span>
  );
}

/**
 * Inline variant — same logic but renders as a fragment, useful when
 * the parent already controls spacing/sizing.
 */
export function NrtAmountInline({
  value,
  showSign = false,
}: {
  value: number | string | null | undefined;
  showSign?: boolean;
}) {
  const result = formatNrt(value, { showSign });

  if (result.type === 'plain') return <>{result.text}</>;

  return (
    <>
      {result.prefix}
      <SubZeros count={result.zeros} />
      {result.suffix}
    </>
  );
}
