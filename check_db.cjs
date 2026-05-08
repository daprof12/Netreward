const { createClient } = require("@supabase/supabase-js");
const supabase = createClient("https://pmpeyfkbqipfnhokfksl.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY");

async function check() {
  const sql = "SELECT id, title, service_id, status FROM public.campaigns;";
  const { data, error } = await supabase.rpc("execute_sql", { sql });
  console.log("Campaigns:", data, error);
  process.exit(0);
}
check();
