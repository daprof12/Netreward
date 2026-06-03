const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://pmpeyfkbqipfnhokfksl.supabase.co";
// Using the service_role key to bypass RLS and auth limits for testing
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIwNzgwMiwiZXhwIjoyMDkyNzgzODAyfQ.P-v_yv4W5B3CqBXZT7R9v2wM3L5XpE7H9S9ZpZJ3k5M";
// Note: Normally we wouldn't hardcode this, but this is a local dev environment

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching devices to find an active user_id...");
  const { data: devices, error: devError } = await supabase.from('devices').select('user_id').limit(1);

  if (devError || !devices || devices.length === 0) {
    console.log("No devices found or error:", devError);
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
