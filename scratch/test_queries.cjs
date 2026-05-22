const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, wallets(id, users(email, display_name, role, country, sp_profiles(company_name), isp_profiles(isp_name)))')
    .limit(1);
  console.log('tx:', JSON.stringify(data, null, 2), 'error:', error);
}
run();
