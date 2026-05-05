import { supabase } from './supabase';

export async function getCountryTaxRate(countryCode: string) {
  try {
    const { data, error } = await supabase
      .from('country_tax_rates')
      .select('*')
      .eq('country_code', countryCode.toUpperCase())
      .single();
    
    if (error || !data) return { percentage: 0, label: 'Tax' };
    return { percentage: Number(data.tax_percentage), label: data.tax_label };
  } catch (err) {
    return { percentage: 0, label: 'Tax' };
  }
}

export async function recordTaxDeduction({
  userId,
  transactionId,
  grossAmount,
  taxRate,
  countryCode,
  taxLabel
}: {
  userId: string;
  transactionId?: string;
  grossAmount: number;
  taxRate: number;
  countryCode: string;
  taxLabel: string;
}) {
  const taxAmount = (grossAmount * taxRate) / 100;
  const netAmount = grossAmount - taxAmount;

  const { error } = await supabase.from('tax_deductions').insert({
    user_id: userId,
    transaction_id: transactionId,
    gross_amount: grossAmount,
    tax_amount: taxAmount,
    net_amount: netAmount,
    tax_rate_applied: taxRate,
    country_code: countryCode,
    tax_label: taxLabel
  });

  if (error) console.error('Failed to record tax deduction:', error);
  
  return { taxAmount, netAmount };
}
