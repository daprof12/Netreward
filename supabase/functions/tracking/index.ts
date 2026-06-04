/**
 * NetReward Tracking API — Supabase Edge Function
 * 
 * Accepts batched tracking events from SP SDKs and forwards them
 * to the reward engine RPC. Provides:
 * 
 *   1. API key lookup (services.api_key / networks.api_key)
 *   2. HMAC-SHA256 signature verification
 *   3. Rate limiting (100 events per batch)
 *   4. Batch processing via process_tracking_report RPC
 * 
 * Usage:
 *   POST /functions/v1/tracking
 *   Headers:
 *     x-sp-api-key: <service API key>        (SP)
 *     x-isp-api-key: <network API key>       (ISP)
 *     x-hmac-sig: HMAC-SHA256(body, secret_key)
 *   Body:
 *     { "events": [{ device_id, campaign_id, session_id, bytes_up, bytes_down, ... }] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sp-api-key, x-isp-api-key, x-hmac-sig',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BATCH_SIZE = 100;

/** Compute HMAC-SHA256 hex digest */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Resolves category for a campaign by querying linked service or network */
async function getCampaignCategory(supabase: any, campaignId: string): Promise<string> {
  try {
    const { data: camp } = await supabase
      .from('campaigns')
      .select(`
        service_id,
        network_id,
        svc:services (category),
        net:networks (category)
      `)
      .eq('id', campaignId)
      .maybeSingle();

    if (camp) {
      if (camp.svc && (camp.svc as any).category) {
        return (camp.svc as any).category.toLowerCase();
      }
      if (camp.net && (camp.net as any).category) {
        return (camp.net as any).category.toLowerCase();
      }
    }
  } catch (err) {
    console.error('Failed to resolve campaign category:', err);
  }
  return 'other';
}

/** Validates reported bandwidth telemetry bounds based on service/network category */
function validateTelemetry(
  category: string,
  bytesUp: number,
  bytesDown: number,
  durationSec: number
): { isAnomaly: boolean; flagType: string; details: string } {
  const totalBytes = bytesUp + bytesDown;
  if (durationSec <= 0) {
    return {
      isAnomaly: true,
      flagType: 'IMPOSSIBLE_SPEED',
      details: `Duration is zero or negative (${durationSec}s).`
    };
  }

  const bytesPerSec = totalBytes / durationSec;

  // Absolute physical boundary for standard consumer connections (100 MB/s)
  const ABSOLUTE_MAX_BYTES_PER_SEC = 100 * 1024 * 1024;
  if (bytesPerSec > ABSOLUTE_MAX_BYTES_PER_SEC) {
    return {
      isAnomaly: true,
      flagType: 'IMPOSSIBLE_SPEED',
      details: `Sustained rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds hardware speed limits (100 MB/s).`
    };
  }

  // Category-specific heuristics
  if (category === 'streaming') {
    // 320 kbps streaming = 40 KB/s. Enforce generous 10 MB/s upper threshold for pre-buffering.
    const STREAMING_MAX_BYTES_PER_SEC = 10 * 1024 * 1024;
    if (bytesPerSec > STREAMING_MAX_BYTES_PER_SEC) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Streaming average speed of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds logical limit (10 MB/s).`
      };
    }
  } else if (category === 'gaming') {
    // Gaming bandwidth is extremely light (rarely exceeding 150 KB/s). Enforce a 250 KB/s cap.
    const GAMING_MAX_BYTES_PER_SEC = 250 * 1024;
    if (bytesPerSec > GAMING_MAX_BYTES_PER_SEC) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Gaming average transfer rate of ${(bytesPerSec / 1024).toFixed(2)} KB/s exceeds logical cap (250 KB/s).`
      };
    }
  } else if (category === 'ai' || category === 'ai service') {
    // AI queries consume up to 5 MB/s on bursts.
    const AI_MAX_BYTES_PER_SEC = 5 * 1024 * 1024;
    if (bytesPerSec > AI_MAX_BYTES_PER_SEC) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `AI service average transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds threshold (5 MB/s).`
      };
    }
  } else if (category === 'browsing') {
    // Browsing average rate cap is 4 MB/s.
    const BROWSING_MAX_BYTES_PER_SEC = 4 * 1024 * 1024;
    if (bytesPerSec > BROWSING_MAX_BYTES_PER_SEC) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Browsing average transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds speed threshold (4 MB/s).`
      };
    }
  } else if (category === 'cloud') {
    // Cloud sync/backups can use up to 50 MB/s.
    const CLOUD_MAX_BYTES_PER_SEC = 50 * 1024 * 1024;
    if (bytesPerSec > CLOUD_MAX_BYTES_PER_SEC) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Cloud transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds logical limit (50 MB/s).`
      };
    }
  }

  return { isAnomaly: false, flagType: 'UNKNOWN', details: '' };
}

serve(async (req) => {
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sp-api-key, x-isp-api-key, x-hmac-sig',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Dynamic SDK Initialization endpoint
    try {
      const url = new URL(req.url);
      const spApiKey = req.headers.get('x-sp-api-key') || url.searchParams.get('sp_key');
      const ispApiKey = req.headers.get('x-isp-api-key') || url.searchParams.get('isp_key');
      if (!spApiKey && !ispApiKey) {
        return jsonResponse({ error: 'Missing API key' }, 401);
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      let category = 'other';
      
      if (spApiKey) {
        // Always check the services table for category — works for both
        // centralized keys (sp_api_keys) and legacy per-service keys.
        const { data: service } = await supabase
          .from('services')
          .select('category')
          .eq('api_key', spApiKey)
          .maybeSingle();

        if (service && service.category) {
          category = service.category.toLowerCase();
        } else {
          // Centralized key — resolve SP email → sp_profiles → services
          const { data: centralKey } = await supabase
            .from('sp_api_keys')
            .select('sp_email')
            .eq('sdk_key', spApiKey)
            .maybeSingle();

          if (centralKey?.sp_email) {
            const { data: spProfile } = await supabase
              .from('sp_profiles')
              .select('id, users!inner(email)')
              .eq('users.email', centralKey.sp_email)
              .maybeSingle();

            if (spProfile) {
              const { data: svc } = await supabase
                .from('services')
                .select('category')
                .eq('sp_id', spProfile.id)
                .limit(1)
                .maybeSingle();
              if (svc?.category) {
                category = svc.category.toLowerCase();
              }
            }
          }
        }
      } else if (ispApiKey) {
        // ISPs don't have categories in the same way, but let's check validity
        const { data: centralKey } = await supabase
          .from('isp_api_keys')
          .select('isp_email')
          .eq('sdk_key', ispApiKey)
          .maybeSingle();
          
        if (!centralKey) {
          await supabase.from('networks').select('id').eq('api_key', ispApiKey).maybeSingle();
        }
        category = 'other';
      }

      return jsonResponse({ category });
    } catch (err) {
      console.error('SDK init error:', err);
      return jsonResponse({ error: 'Failed to initialize SDK' }, 500);
    }
  }

  // Only POST allowed for tracking events
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── 1. Extract API key ─────────────────────────────────────
    // Support both headers (fetch) and query params (sendBeacon fallback)
    const url = new URL(req.url);
    const spApiKey = req.headers.get('x-sp-api-key') || url.searchParams.get('sp_key');
    const ispApiKey = req.headers.get('x-isp-api-key') || url.searchParams.get('isp_key');
    const hmacSig = req.headers.get('x-hmac-sig');

    if (!spApiKey && !ispApiKey) {
      return jsonResponse({ error: 'Missing API key. Provide x-sp-api-key or x-isp-api-key header.' }, 401);
    }

    // For CDN integration, hmac signature is optional. If provided, we verify it.
    // If not provided, we rely on the SP API key.
    // Note: In production, Origin verification should be added here to prevent spoofing.

    // ── 2. Read and parse body ─────────────────────────────────
    const bodyText = await req.text();
    let payload: { events?: unknown[] };
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const { events } = payload;
    if (!Array.isArray(events) || events.length === 0) {
      return jsonResponse({ error: 'Payload must contain a non-empty "events" array' }, 400);
    }

    if (events.length > MAX_BATCH_SIZE) {
      return jsonResponse({ error: `Batch too large. Max ${MAX_BATCH_SIZE} events per request.` }, 400);
    }

    let serviceId: string | null = null;
    let networkId: string | null = null;
    let secretKey: string | null = null;
    let providerType: string | null = null;

    if (spApiKey) {
      // 1. Try centralized sp_api_keys table
      const { data: centralKey } = await supabase
        .from('sp_api_keys')
        .select('webhook_secret, status, sp_email')
        .eq('sdk_key', spApiKey)
        .maybeSingle();

      if (centralKey) {
        if (centralKey.status !== 'active') {
          return jsonResponse({ error: `SP account is ${centralKey.status}` }, 403);
        }
        secretKey = centralKey.webhook_secret;

        // Resolve serviceId from centralized key → SP email → sp_profiles → services
        // This is required for auto campaign lookup.
        const { data: svc } = await supabase
          .from('services')
          .select('id, sp_id, status')
          .eq('api_key', spApiKey)
          .maybeSingle();

        if (svc) {
          serviceId = svc.id;
        } else if (centralKey.sp_email) {
          // Fallback: resolve via SP email → sp_profiles → services
          const { data: spProfile } = await supabase
            .from('sp_profiles')
            .select('id, users!inner(email)')
            .eq('users.email', centralKey.sp_email)
            .maybeSingle();

          if (spProfile) {
            const { data: spSvc } = await supabase
              .from('services')
              .select('id')
              .eq('sp_id', spProfile.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (spSvc) serviceId = spSvc.id;
          }
        }
      } else {
        // 2. Fallback to legacy services table
        const { data: service, error } = await supabase
          .from('services')
          .select('id, sp_id, status')
          .eq('api_key', spApiKey)
          .single();

        if (error || !service) {
          return jsonResponse({ error: 'Invalid SP API key' }, 401);
        }

        if (service.status !== 'active') {
          return jsonResponse({ error: `Service is ${service.status}` }, 403);
        }

        secretKey = null;
        serviceId = service.id;
      }
      providerType = 'sp';
    } else if (ispApiKey) {
      // 1. Try centralized isp_api_keys table
      const { data: centralKey } = await supabase
        .from('isp_api_keys')
        .select('webhook_secret, status')
        .eq('sdk_key', ispApiKey)
        .maybeSingle();

      if (centralKey) {
        if (centralKey.status !== 'active') {
          return jsonResponse({ error: `ISP account is ${centralKey.status}` }, 403);
        }
        secretKey = centralKey.webhook_secret;
      } else {
        // 2. Fallback to legacy networks table
        const { data: network, error } = await supabase
          .from('networks')
          .select('id, isp_id, verified')
          .eq('api_key', ispApiKey)
          .single();

        if (error || !network) {
          return jsonResponse({ error: 'Invalid ISP API key' }, 401);
        }

        if (!network.verified) {
          return jsonResponse({ error: 'Network is not verified' }, 403);
        }

        secretKey = null;
        networkId = network.id;
      }
      providerType = 'isp';
    }

    // Dynamic Campaign Lookup if no campaign_id is provided in the events
    let autoCampaignId: string | null = null;
    if (serviceId) {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('id')
        .eq('service_id', serviceId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (camp) autoCampaignId = camp.id;
    } else if (networkId) {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('id')
        .eq('network_id', networkId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (camp) autoCampaignId = camp.id;
    }

    // ── 3b. Device fingerprint resolver ────────────────────────────────────
    // tracker.js sends a browser fingerprint as device_id.
    // We resolve it to the actual devices.id UUID here server-side.
    //
    // Resolution order:
    //   1. Direct UUID match in devices.id
    //   2. Fingerprint column match in devices.fingerprint
    //   3. Find enrolled user's EXISTING device → link fingerprint to it
    //      (No phantom "SDK Device" creation — telemetry flows to the real device)
    //   4. Last resort: create a minimal device only if no existing device exists
    async function resolveDeviceId(rawDeviceId: string, campaignId?: string): Promise<string | null> {
      // 1. Direct UUID match
      const { data: directMatch } = await supabase
        .from('devices')
        .select('id')
        .eq('id', rawDeviceId)
        .maybeSingle();
      if (directMatch) return directMatch.id;

      // 2. Fingerprint match
      const { data: fpMatch } = await supabase
        .from('devices')
        .select('id')
        .eq('fingerprint', rawDeviceId)
        .maybeSingle();
      if (fpMatch) return fpMatch.id;

      // 3. Find enrolled user's existing device and link the fingerprint
      if (campaignId) {
        // Get all users enrolled in this campaign
        const { data: enrollments } = await supabase
          .from('user_campaigns')
          .select('user_id')
          .eq('campaign_id', campaignId);

        if (enrollments && enrollments.length > 0) {
          const userIds = enrollments.map((e: any) => e.user_id);

          // Find any existing device belonging to one of these users
          // Prefer devices that don't already have a fingerprint (unlinked)
          const { data: existingDevice } = await supabase
            .from('devices')
            .select('id, fingerprint')
            .in('user_id', userIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10);

          if (existingDevice && existingDevice.length > 0) {
            // Prefer a device without a fingerprint, otherwise use the most recent
            const unlinked = existingDevice.find((d: any) => !d.fingerprint);
            const target = unlinked || existingDevice[0];

            // Attach the browser fingerprint to this device for future lookups
            await supabase
              .from('devices')
              .update({ fingerprint: rawDeviceId })
              .eq('id', target.id);

            console.log(`[Device Resolver] Linked fingerprint ${rawDeviceId} to existing device ${target.id}`);
            return target.id;
          }

          // No device exists for enrolled users — create one under the first enrolled user
          const { data: newDevice, error: insertErr } = await supabase
            .from('devices')
            .insert({
              user_id: userIds[0],
              device_name: 'Web Browser',
              device_type: 'other',
              os: 'Web',
              fingerprint: rawDeviceId,
              status: 'active',
              signal_strength: 100,
            })
            .select('id')
            .single();

          if (!insertErr && newDevice) {
            console.log(`[Device Resolver] Created device ${newDevice.id} for enrolled user ${userIds[0]} (no existing device found)`);
            return newDevice.id;
          }
        }
      }

      // 4. Fallback: try SP/ISP owner's device
      let ownerUserId: string | null = null;
      if (serviceId) {
        const { data: svc } = await supabase
          .from('services')
          .select('sp_id, sp:sp_profiles(user_id)')
          .eq('id', serviceId)
          .maybeSingle();
        const sp = Array.isArray(svc?.sp) ? svc.sp[0] : svc?.sp;
        if (sp?.user_id) ownerUserId = sp.user_id;
      } else if (networkId) {
        const { data: net } = await supabase
          .from('networks')
          .select('isp_id, isp:isp_profiles(user_id)')
          .eq('id', networkId)
          .maybeSingle();
        const isp = Array.isArray(net?.isp) ? net.isp[0] : net?.isp;
        if (isp?.user_id) ownerUserId = isp.user_id;
      }

      if (ownerUserId) {
        // Try to use owner's existing device
        const { data: ownerDevice } = await supabase
          .from('devices')
          .select('id')
          .eq('user_id', ownerUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ownerDevice) {
          await supabase
            .from('devices')
            .update({ fingerprint: rawDeviceId })
            .eq('id', ownerDevice.id);
          console.log(`[Device Resolver] Linked fingerprint to SP/ISP owner's device ${ownerDevice.id}`);
          return ownerDevice.id;
        }
      }

      console.error(`[Device Resolver] No device found for fingerprint: ${rawDeviceId}`);
      return null;
    }

    /** Resolves active ISP campaign user is enrolled in based on device's isp_name */
    async function resolveIspCampaignId(userId: string, ispName: string): Promise<string | null> {
      try {
        if (!ispName) return null;

        // Find the network by name matching the device's isp_name
        const { data: networkObj } = await supabase
          .from('networks')
          .select('id')
          .ilike('name', ispName)
          .eq('verified', true)
          .maybeSingle();

        if (!networkObj) return null;

        // Find the active campaign for this network
        const { data: networkCamp } = await supabase
          .from('campaigns')
          .select('id')
          .eq('network_id', networkObj.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!networkCamp) return null;

        // Check if the user is enrolled in this campaign
        const { data: enrollmentObj } = await supabase
          .from('user_campaigns')
          .select('id')
          .eq('user_id', userId)
          .eq('campaign_id', networkCamp.id)
          .maybeSingle();

        if (enrollmentObj) {
          return networkCamp.id;
        }
      } catch (err) {
        console.error('Failed to resolve ISP campaign ID:', err);
      }
      return null;
    }

    // Verify HMAC signature if provided or if this is an ISP (ISPs must always use HMAC)
    if (providerType === 'isp' && !hmacSig) {
      return jsonResponse({ error: 'ISPs must sign requests with x-hmac-sig.' }, 401);
    }

    if (hmacSig) {
      if (!secretKey) {
        return jsonResponse({ error: 'Service/network has no secret key configured. Generate credentials in the dashboard.' }, 403);
      }
      const expectedSig = await hmacSha256(secretKey, bodyText);
      if (!timingSafeEqual(hmacSig.toLowerCase(), expectedSig.toLowerCase())) {
        return jsonResponse({ error: 'HMAC signature verification failed. Ensure you are signing the raw request body with your secret key.' }, 401);
      }
    }

    // ── 4. Process batch ───────────────────────────────────────
    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;
    let errorCount = 0;

    // Caching resolved campaign categories to minimize DB queries in batch
    const categoryCache: Record<string, string> = {};

    for (const event of events) {
      const {
        device_id: rawDeviceId,
        campaign_id,
        session_id,
        bytes_up = 0,
        bytes_down = 0,
        duration_seconds = 60,
        session_start,
        session_end,
        // Optional gaming metadata: set by tracker.js data-gaming-platform attribute
        gaming_platform = null,
      } = event as Record<string, unknown>;

      let finalCampaignId = campaign_id || autoCampaignId;

      // Validate required fields (raw)
      if (!rawDeviceId || !finalCampaignId || !session_id) {
        results.push({
          session_id: session_id || 'unknown',
          status: 'error',
          message: 'Missing required fields: device_id, campaign_id (or no active campaign found), session_id',
        });
        errorCount++;
        continue;
      }

      // Resolve rawDeviceId (may be a fingerprint) → actual devices.id
      const device_id = await resolveDeviceId(rawDeviceId as string, finalCampaignId as string);
      if (!device_id) {
        results.push({
          session_id,
          status: 'error',
          message: `Device not found. Ensure the device is registered in NetReward before sending telemetry. (lookup: ${rawDeviceId})`,
        });
        errorCount++;
        continue;
      }

      // Fetch device user_id and isp_name to support parallel ISP tracking
      let deviceUserId: string | null = null;
      let deviceIspName: string | null = null;
      try {
        const { data: devObj } = await supabase
          .from('devices')
          .select('user_id, isp_name')
          .eq('id', device_id)
          .maybeSingle();
        if (devObj) {
          deviceUserId = devObj.user_id;
          deviceIspName = devObj.isp_name;
        }
      } catch (e) {
        console.error('Error fetching device user/isp info:', e);
      }

      // Dynamic Telemetry Sanitizer Validation
      let category = categoryCache[finalCampaignId as string];
      if (!category) {
        category = await getCampaignCategory(supabase, finalCampaignId as string);
        categoryCache[finalCampaignId as string] = category;
      }

      const validation = validateTelemetry(
        category,
        Number(bytes_up),
        Number(bytes_down),
        Number(duration_seconds)
      );

      if (validation.isAnomaly) {
        // Option B: Log to tracking_anomalies, but proceed with RPC processing
        try {
          const { data: userData } = await supabase
            .from('devices')
            .select('users(email)')
            .eq('id', device_id)
            .maybeSingle();
          
          const userEmail = (userData?.users as any)?.email || 'unknown@netreward.online';

          await supabase.from('tracking_anomalies').insert({
            session_id: session_id as string,
            user_email: userEmail,
            flag_type: validation.flagType,
            details: `[Category: ${category.toUpperCase()}] ${validation.details}`,
            status: 'open'
          });

          console.log(`[Telemetry Anomaly Logged] Session: ${session_id}, Flag: ${validation.flagType}, Details: ${validation.details}`);
        } catch (anomalyErr) {
          console.error('Failed to log tracking anomaly:', anomalyErr);
        }
      }

      // Call the Reward Engine RPC
      const { data, error } = await supabase.rpc('process_tracking_report', {
        p_device_id: device_id,
        p_campaign_id: finalCampaignId,
        p_session_id: session_id,
        p_bytes_up: Number(bytes_up),
        p_bytes_down: Number(bytes_down),
        p_duration_seconds: Number(duration_seconds),
        p_session_start: (session_start as string) || new Date(Date.now() - Number(duration_seconds) * 1000).toISOString(),
        p_session_end: (session_end as string) || new Date().toISOString(),
        p_gaming_platform: gaming_platform as string | null
      });

      if (error) {
        results.push({
          session_id,
          status: 'error',
          message: error.message,
        });
        errorCount++;
      } else {
        const rpcData = data as Record<string, unknown>;
        results.push(rpcData);
        successCount++;

        // Write to tracking_sessions for admin visibility
        // Resolve user email and campaign name for the admin table
        try {
          const { data: deviceUser } = await supabase
            .from('devices')
            .select('users(email)')
            .eq('id', device_id)
            .maybeSingle();

          const { data: campInfo } = await supabase
            .from('campaigns')
            .select(`
              title,
              sp:sp_profiles(users(email)),
              isp:isp_profiles(users(email))
            `)
            .eq('id', finalCampaignId)
            .maybeSingle();

          const userEmail = (deviceUser?.users as any)?.email || 'unknown';
          const campaignName = campInfo?.title || String(finalCampaignId);
          const spArr = campInfo?.sp;
          const spEmail = spArr
            ? (Array.isArray(spArr) ? (spArr[0]?.users as any)?.email : (spArr as any)?.users?.email) || ''
            : '';

          const nrtAwarded = rpcData.status === 'success'
            ? Number((rpcData.splits as any)?.user ?? 0)
            : 0;

          // Resolve gaming context from RPC response (populated for gaming campaigns)
          const rpcGamingPlatform = rpcData.gaming_platform as string | null || gaming_platform as string | null || null;
          const rpcGamingUsername = rpcData.gaming_username as string | null || null;

          // Determine source label
          let sessionSource = providerType === 'isp' ? 'isp_sdk' : 'sdk';
          if (rpcGamingPlatform) sessionSource = `gaming_${rpcGamingPlatform}`;

          // Map all RPC statuses to tracking_sessions status values
          const rpcStatus = rpcData.status as string;
          const tsStatus =
            rpcStatus === 'success' ? 'verified' :
            rpcStatus === 'recorded' ? 'verified' :
            rpcStatus === 'duplicate' ? 'duplicate' :
            rpcStatus === 'pending_gaming_account' ? 'pending' :
            rpcStatus === 'skipped' ? 'skipped' : 'error';

          const rejectReason =
            rpcStatus === 'pending_gaming_account'
              ? 'Gaming account not linked — rewards withheld until account is linked'
              : rpcStatus !== 'success' && rpcStatus !== 'recorded'
                ? String(rpcData.message ?? '')
                : '';

          const rpcServiceId = rpcData.service_id as string | null || null;
          const rpcNetworkId = rpcData.network_id as string | null || null;
          const rpcCategory = rpcData.category as string | null || null;
          const rpcGamingAccountId = rpcData.gaming_account_id as string | null || null;

          await supabase.from('tracking_sessions').insert({
            session_id: String(session_id),
            user_email: userEmail,
            campaign_name: campaignName,
            sp_email: spEmail,
            source: sessionSource,
            device_ip: rpcGamingUsername ? `[gaming:${rpcGamingUsername}]` : '',
            data_rx_bytes: Number(bytes_down),
            data_tx_bytes: Number(bytes_up),
            duration_seconds: Number(duration_seconds),
            nrt_awarded: nrtAwarded,
            validation_score: validation.isAnomaly ? 0.5 : 1.0,
            status: tsStatus,
            reject_reason: rejectReason,
            service_id: rpcServiceId,
            network_id: rpcNetworkId,
            category: rpcCategory,
            gaming_account_id: rpcGamingAccountId,
          });

          // Parallel ISP Tracking: if the device is on an ISP network and the user has joined that ISP campaign
          if (deviceUserId && deviceIspName) {
            const ispCampaignId = await resolveIspCampaignId(deviceUserId, deviceIspName);
            if (ispCampaignId && ispCampaignId !== finalCampaignId) {
              try {
                const { data: ispData, error: ispError } = await supabase.rpc('process_tracking_report', {
                  p_device_id: device_id,
                  p_campaign_id: ispCampaignId,
                  p_session_id: `${session_id}_isp`,
                  p_bytes_up: Number(bytes_up),
                  p_bytes_down: Number(bytes_down),
                  p_duration_seconds: Number(duration_seconds),
                  p_session_start: (session_start as string) || new Date(Date.now() - Number(duration_seconds) * 1000).toISOString(),
                  p_session_end: (session_end as string) || new Date().toISOString(),
                  p_gaming_platform: null
                });

                if (ispError) {
                  console.warn(`[ISP Parallel Tracking Failed] Campaign: ${ispCampaignId}, Error: ${ispError.message}`);
                } else {
                  console.log(`[ISP Parallel Tracking Succeeded] Campaign: ${ispCampaignId}`);
                  
                  // Write parallel entry to tracking_sessions for admin visibility
                  try {
                    const { data: ispCampInfo } = await supabase
                      .from('campaigns')
                      .select(`
                        title,
                        isp:isp_profiles(users(email))
                      `)
                      .eq('id', ispCampaignId)
                      .maybeSingle();

                    const ispCampaignName = ispCampInfo?.title || String(ispCampaignId);
                    const ispProfileArr = ispCampInfo?.isp;
                    const ispEmail = ispProfileArr
                      ? (Array.isArray(ispProfileArr) ? (ispProfileArr[0]?.users as any)?.email : (ispProfileArr as any)?.users?.email) || ''
                      : '';

                    const ispRpcData = ispData as Record<string, unknown>;
                    const ispNrtAwarded = ispRpcData.status === 'success'
                      ? Number((ispRpcData.splits as any)?.user ?? 0)
                      : 0;

                    await supabase.from('tracking_sessions').insert({
                      session_id: `${session_id}_isp`,
                      user_email: userEmail,
                      campaign_name: ispCampaignName,
                      sp_email: '',
                      source: 'isp_sdk',
                      device_ip: '',
                      data_rx_bytes: Number(bytes_down),
                      data_tx_bytes: Number(bytes_up),
                      duration_seconds: Number(duration_seconds),
                      nrt_awarded: ispNrtAwarded,
                      validation_score: validation.isAnomaly ? 0.5 : 1.0,
                      status: ispRpcData.status === 'success' || ispRpcData.status === 'recorded' ? 'verified' : 'error',
                      reject_reason: ispRpcData.status !== 'success' && ispRpcData.status !== 'recorded' ? String(ispRpcData.message ?? '') : '',
                      service_id: null,
                      network_id: (ispRpcData as any).network_id || null,
                      category: 'broadband',
                      gaming_account_id: null
                    });
                  } catch (tsIspErr) {
                    console.error('[ISP tracking_sessions write failed]', tsIspErr);
                  }
                }
              } catch (ispRpcErr) {
                console.error('[ISP Parallel Tracking RPC Exception]', ispRpcErr);
              }
            }
          }
        } catch (tsErr) {
          // Non-fatal: log but don't fail the response
          console.error('[tracking_sessions write failed]', tsErr);
        }
      }
    }

    // ── 5. Return response ─────────────────────────────────────
    return jsonResponse({
      success: true,
      provider_type: providerType,
      total: events.length,
      processed: successCount,
      errors: errorCount,
      results,
    });

  } catch (error) {
    console.error('Tracking API error:', error);
    return jsonResponse({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});
