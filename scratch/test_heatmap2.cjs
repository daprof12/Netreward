require('dotenv').config({ path: '.env' });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl ? "Found" : "Missing");
console.log("Key:", supabaseKey ? "Found" : "Missing");

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching devices to find an active user_id...");
  const { data: devices, error: devError } = await supabase.from('devices').select('user_id').limit(1);
  
  if (devError) {
    console.error("Device fetch error:", devError);
  }
  
  if (!devices || devices.length === 0) {
    console.log("No devices found, try to fetch users...");
    // Just try to fetch some user ID
    process.exit(1);
  }
  
  const userId = devices[0].user_id;
  console.log("Found active user_id:", userId);

  console.log("Calling get_user_earnings_heatmap...");
  const { data: userHeatmap, error: userHeatmapError } = await supabase.rpc('get_user_earnings_heatmap', { p_user_id: userId });
  
  if (userHeatmapError) {
    console.error("get_user_earnings_heatmap failed:", userHeatmapError);
  } else {
    console.log("get_user_earnings_heatmap success! Count:", userHeatmap?.length);
    if (userHeatmap?.length > 0) {
      console.log("First item:", userHeatmap[0]);
      console.log("Last item:", userHeatmap[userHeatmap.length - 1]);
      
      const nonZero = userHeatmap.filter(d => d.intensity > 0);
      console.log(`Found ${nonZero.length} days with intensity > 0`);
      if (nonZero.length > 0) {
        console.log("Sample non-zero:", nonZero[0]);
      }
    }
  }
  process.exit(0);
}

check();
