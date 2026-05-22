import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('device_data_sessions').select(`
    *,
    device:devices(
      device_name,
      users:user_id(email)
    ),
    campaign:campaigns(
      name,
      title,
      network:networks(name, category),
      service:services(name, category)
    )
  `).limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

test();
