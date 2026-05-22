import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pmpeyfkbqipfnhokfksl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY'
);

async function test() {
  const spApiKey = 'nr_live_73a0395d00914e65af769475';
  
  const { data: service, error } = await supabase
    .from('services')
    .select('id, sp_id, secret_key, status, api_key')
    .eq('api_key', spApiKey)
    .single();

  console.log('Single POST query result:', { service, error });

  const { data: service2, error: error2 } = await supabase
    .from('services')
    .select('category')
    .eq('api_key', spApiKey)
    .maybeSingle();
  
  console.log('MaybeSingle GET query result:', { service: service2, error: error2 });
}

test();
