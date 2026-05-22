import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pmpeyfkbqipfnhokfksl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY'
);

async function test() {
  const spApiKey = 'nr_live_10f0ddafef9e44a1954e048d';
  
  const { data: service } = await supabase
    .from('services')
    .select('id, sp_id, status')
    .eq('api_key', spApiKey)
    .single();

  console.log('Service:', service);

  if (service) {
    const { data: camp } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('service_id', service.id)
      .eq('status', 'active');
    console.log('Campaigns:', camp);
  }
}

test();
