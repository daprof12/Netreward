import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('device_data_sessions')
    .select(`
      *,
      campaign:campaigns!campaign_id (
        title,
        service:services(name)
      )
    `)
    .limit(1);
  console.log('SP Query:', JSON.stringify({data, error}, null, 2));

  const { data: d2, error: e2 } = await supabase
    .from('devices')
    .select(`
      *, 
      device_data_sessions(
        campaign:campaigns(title)
      )
    `)
    .limit(1);
  console.log('ISP Query:', JSON.stringify({data: d2, error: e2}, null, 2));
}

test();
