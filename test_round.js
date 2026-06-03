const abs = 0.00000000000000035049;
const raw = abs.toFixed(18);
const afterDot = raw.split('.')[1] || '';
let leadingZeros = 0;
for (const ch of afterDot) {
  if (ch === '0') leadingZeros++;
  else break;
}
// restrict decimals to max 18
const decimals = Math.min(18, leadingZeros + 3);
const factor = Math.pow(10, decimals);
const roundedAbs = Math.ceil(abs * factor) / factor;
console.log({
  abs, leadingZeros, decimals, roundedAbs, 
  roundedRaw: roundedAbs.toFixed(18).replace(/0+$/, '')
});
