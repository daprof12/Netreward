/**
 * Deep Diagnostic: Verify the full data flow from tracker.js
 * through the Edge Function → RPC → device_data_sessions
 */
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://pmpeyfkbqipfnhokfksl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY"
);

async function diagnose() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "greatdaprof@gmail.com",
    password: "password123"
  });
  if (authError) throw authError;
  console.log("✅ Logged in as:", authData.user.email);

  // 1. Get user's devices
  const { data: devices } = await supabase
    .from('devices')
    .select('id, device_name, fingerprint, status, user_id')
    .eq('user_id', authData.user.id);

  console.log("\n📱 USER DEVICES:", JSON.stringify(devices, null, 2));

  // 2. Check device_data_sessions for any of those device IDs
  if (devices && devices.length > 0) {
    const deviceIds = devices.map(d => d.id);
    const { data: sessions } = await supabase
      .from('device_data_sessions')
      .select('id, device_id, campaign_id, session_id, bytes_up, bytes_down, duration_seconds, nrt_awarded, session_start, session_end')
      .in('device_id', deviceIds)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`\n📊 device_data_sessions (latest 10 for user's devices):`);
    if (!sessions || sessions.length === 0) {
      console.log("  ❌ NO RECORDS FOUND in device_data_sessions for these devices!");
    } else {
      sessions.forEach(s => {
        const totalBytes = s.bytes_up + s.bytes_down;
        const totalGb = totalBytes / 1_000_000_000;
        console.log(`  ✅ session_id: ${s.session_id.substring(0,16)}... | bytes: ${totalBytes} (${totalGb.toFixed(8)} GB) | duration: ${s.duration_seconds}s | nrt: ${s.nrt_awarded}`);
      });
    }
  }

  // 3. Check tracking_sessions (admin view) for user
  const { data: trackSessions } = await supabase
    .from('tracking_sessions')
    .select('id, session_id, user_email, campaign_name, data_rx_bytes, duration_seconds, nrt_awarded, status')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\n🗂️ tracking_sessions (latest 10 admin records):`);
  if (!trackSessions || trackSessions.length === 0) {
    console.log("  ❌ NO RECORDS FOUND in tracking_sessions!");
  } else {
    trackSessions.forEach(s => {
      console.log(`  session_id: ${s.session_id} | email: ${s.user_email} | campaign: ${s.campaign_name} | bytes_down: ${s.data_rx_bytes} | nrt: ${s.nrt_awarded} | status: ${s.status}`);
    });
  }

  // 4. Check user_campaigns - reward totals
  const { data: userCampaigns } = await supabase
    .from('user_campaigns')
    .select('campaign_id, unclaimed_nrt, data_consumed_gb')
    .eq('user_id', authData.user.id);

  console.log("\n🎯 user_campaigns reward totals:", JSON.stringify(userCampaigns, null, 2));

  // 5. Check wallet balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('unclaimed_nrt, nrt_balance')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  console.log("\n💰 WALLET:", JSON.stringify(wallet, null, 2));

  // 6. Try calling RPC directly with a test payload to see what it returns
  console.log("\n🧪 Testing process_tracking_report RPC directly...");
  if (devices && devices.length > 0) {
    // Find an active campaign to test with
    const { data: enrollment } = await supabase
      .from('user_campaigns')
      .select('campaign_id')
      .eq('user_id', authData.user.id)
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      const testSessionId = 'diag-test-' + Date.now();
      // Use a realistic 60s of 320kbps streaming
      const bytesDown = Math.floor(60 * (320_000 / 8)); // 2,400,000 bytes = 0.0024 GB
      const bytesUp = Math.floor(bytesDown * 0.05);

      console.log(`  Sending: device_id=${devices[0].id}, campaign_id=${enrollment.campaign_id}`);
      console.log(`  bytes_down=${bytesDown} (${(bytesDown/1e9).toFixed(8)} GB), bytes_up=${bytesUp}, duration=60s`);

      const now = new Date();
      const start = new Date(now.getTime() - 60_000);

      const { data: rpcResult, error: rpcError } = await supabase.rpc('process_tracking_report', {
        p_device_id: devices[0].id,
        p_campaign_id: enrollment.campaign_id,
        p_session_id: testSessionId,
        p_bytes_up: bytesUp,
        p_bytes_down: bytesDown,
        p_duration_seconds: 60,
        p_session_start: start.toISOString(),
        p_session_end: now.toISOString()
      });

      if (rpcError) {
        console.log("  ❌ RPC ERROR:", rpcError.message);
      } else {
        console.log("  ✅ RPC RESULT:", JSON.stringify(rpcResult, null, 2));

        // Verify it was actually written
        const { data: newSession } = await supabase
          .from('device_data_sessions')
          .select('*')
          .eq('session_id', testSessionId)
          .maybeSingle();
        if (newSession) {
          console.log("  ✅ CONFIRMED: Row written to device_data_sessions:", JSON.stringify(newSession, null, 2));
        } else {
          console.log("  ❌ CONFIRMED: Row NOT written to device_data_sessions despite RPC success!");
        }
      }
    } else {
      console.log("  ⚠️ No user_campaigns enrollment found to test with.");
    }
  }

  // 7. Check what tracker.js sends as device_id (localStorage key = 'nrt_device_id')
  // vs what is stored in DB as devices.id
  console.log("\n⚠️ KEY MISMATCH DIAGNOSTIC:");
  console.log("  tracker.js uses localStorage key 'nrt_device_id' as device_id in events.");
  console.log("  Devices in DB:", devices?.map(d => ({ id: d.id, fingerprint: d.fingerprint })));
  console.log("  If 'nrt_device_id' in localStorage ≠ devices.id in DB, ALL events fail with 'Device not found'");

  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
