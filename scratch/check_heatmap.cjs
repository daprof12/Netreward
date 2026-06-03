const { createClient } = require("@supabase/supabase-js");
const supabase = createClient("https://pmpeyfkbqipfnhokfksl.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY");

async function check() {
  console.log("Fetching first user...");
  const { data: users, error: userError } = await supabase.from('users').select('id, role, active_role, display_name').limit(1);
  if (userError) {
    console.error("Fetch users failed:", userError);
    process.exit(1);
  }
  if (!users || users.length === 0) {
    console.log("No users found.");
    process.exit(0);
  }
  const user = users[0];
  console.log("Testing user:", user);

  console.log("Calling get_user_earnings_heatmap...");
  const { data: userHeatmap, error: userHeatmapError } = await supabase.rpc('get_user_earnings_heatmap', { p_user_id: user.id });
  if (userHeatmapError) {
    console.error("get_user_earnings_heatmap failed:", userHeatmapError);
  } else {
    console.log("get_user_earnings_heatmap success! Count:", userHeatmap?.length, "Sample:", userHeatmap?.[0]);
  }

  console.log("Calling get_sp_platform_activity_heatmap...");
  const { data: spHeatmap, error: spHeatmapError } = await supabase.rpc('get_sp_platform_activity_heatmap', { p_sp_id: user.id });
  if (spHeatmapError) {
    console.error("get_sp_platform_activity_heatmap failed:", spHeatmapError);
  } else {
    console.log("get_sp_platform_activity_heatmap success! Count:", spHeatmap?.length);
  }

  process.exit(0);
}
check();
