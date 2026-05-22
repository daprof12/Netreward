const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://pmpeyfkbqipfnhokfksl.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY"
);

async function inspect() {
  try {
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, service_id, sp_id, status');
    
    if (campaignError) throw campaignError;
    
    console.log("All Campaigns in DB:", campaigns);
  } catch (err) {
    console.error("Inspection error:", err);
  }
  process.exit(0);
}

inspect();
