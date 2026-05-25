import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmpeyfkbqipfnhokfksl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      sp:sp_profiles (company_name, logo_url, users (display_name)),
      isp:isp_profiles (isp_name, logo_url, users (display_name)),
      svc:services (name, logo_url, category),
      net:networks (name, logo_url, category)
    `)
    .limit(2);

  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
