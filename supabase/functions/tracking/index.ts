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

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || 'https://netreward.app';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sp-api-key, x-isp-api-key, x-hmac-sig',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

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
  durationSec: number,
  limits: Record<string, number>
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

  const getLimit = (cat: string) => {
    const mbLimit = limits[cat] || limits.default || 100;
    return mbLimit * 1024 * 1024;
  };

  // Absolute physical boundary for standard consumer connections
  const ABSOLUTE_MAX_BYTES_PER_SEC = getLimit('default');
  if (bytesPerSec > ABSOLUTE_MAX_BYTES_PER_SEC) {
    return {
      isAnomaly: true,
      flagType: 'IMPOSSIBLE_SPEED',
      details: `Sustained rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds hardware speed limits (${limits.default || 100} MB/s).`
    };
  }

  // Category-specific heuristics
  if (category === 'streaming') {
    const limit = getLimit('streaming');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Streaming average speed of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds logical limit (${limits.streaming || 10} MB/s).`
      };
    }
  } else if (category === 'gaming') {
    const limit = getLimit('gaming');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Gaming average transfer rate of ${(bytesPerSec / 1024).toFixed(2)} KB/s exceeds logical cap (${(limits.gaming || 0.25) * 1024} KB/s).`
      };
    }
  } else if (category === 'ai' || category === 'ai service') {
    const limit = getLimit('ai');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `AI service average transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds threshold (${limits.ai || 5} MB/s).`
      };
    }
  } else if (category === 'browsing' || category === 'ecommerce') {
    const limit = getLimit('browsing');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Browsing/Ecommerce average transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds speed threshold (${limits.browsing || 4} MB/s).`
      };
    }
  } else if (category === 'social') {
    const limit = getLimit('social');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Social average transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds threshold (${limits.social || 8} MB/s).`
      };
    }
  } else if (category === 'cloud') {
    const limit = getLimit('cloud');
    if (bytesPerSec > limit) {
      return {
        isAnomaly: true,
        flagType: 'HIGH_VOLUME',
        details: `Cloud transfer rate of ${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s exceeds logical limit (${limits.cloud || 50} MB/s).`
      };
    }
  }

  return { isAnomaly: false, flagType: 'UNKNOWN', details: '' };
}
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 60;

function checkRateLimit(ip: string | null, apiKey: string | null): boolean {
  const key = `${ip || 'unknown'}-${apiKey || 'unknown'}`;
  const now = Date.now();
  const entry = rateLimiter.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_REQUESTS_PER_MINUTE) return false;
    entry.count++;
  } else {
    rateLimiter.set(key, { count: 1, resetAt: now + 60000 });
  }

  // Cleanup old entries randomly to prevent memory leak
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimiter.entries()) {
      if (Date.now() > v.resetAt) rateLimiter.delete(k);
    }
  }

  return true;
}

serve(async (req) => {
  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
  const url = new URL(req.url);
  const tempSpKey = req.headers.get('x-sp-api-key') || url.searchParams.get('sp_key');
  const tempIspKey = req.headers.get('x-isp-api-key') || url.searchParams.get('isp_key');
  const tempApiKey = tempSpKey || tempIspKey;

  if (!checkRateLimit(clientIp, tempApiKey)) {
    return jsonResponse({ error: 'Too many requests' }, 429);
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

    // ── 1. Extract API key & JWT ─────────────────────────────────────
    // Support both headers (fetch) and query params (sendBeacon fallback)
    const url = new URL(req.url);
    const spApiKey = req.headers.get('x-sp-api-key') || url.searchParams.get('sp_key');
    const ispApiKey = req.headers.get('x-isp-api-key') || url.searchParams.get('isp_key');
    const hmacSig = req.headers.get('x-hmac-sig');
    
    const authHeader = req.headers.get('authorization');
    let jwtUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userObj, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && userObj?.user) {
        jwtUserId = userObj.user.id;
      }
    }

    if (!spApiKey && !ispApiKey && !jwtUserId) {
      return jsonResponse({ error: 'Missing Authentication. Provide x-sp-api-key, x-isp-api-key, or Authorization JWT header.' }, 401);
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
      const { data: centralKey, error: centralKeyErr } = await supabase
        .from('sp_api_keys')
        .select('webhook_secret, status, sp_email')
        .eq('sdk_key', spApiKey)
        .maybeSingle();

      console.log('SP_API_KEY received:', spApiKey);
      console.log('Central Key DB result:', { centralKey, centralKeyErr });

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
    } else if (jwtUserId) {
      // If authenticating via JWT (Chrome Extension), fallback to user's most recent active campaign
      const { data: enrollment } = await supabase
        .from('user_campaigns')
        .select('campaign_id')
        .eq('user_id', jwtUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (enrollment) autoCampaignId = enrollment.campaign_id;
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

      // 5. JWT User Fallback (Chrome Extension)
      if (jwtUserId) {
        const { data: userDevice } = await supabase
          .from('devices')
          .select('id')
          .eq('user_id', jwtUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userDevice) {
           await supabase.from('devices').update({ fingerprint: rawDeviceId }).eq('id', userDevice.id);
           return userDevice.id;
        } else {
           // Create one
           const { data: newDevice, error: insertErr } = await supabase.from('devices').insert({
              user_id: jwtUserId,
              device_name: 'Web Browser',
              device_type: 'other',
              os: 'Web',
              fingerprint: rawDeviceId,
              status: 'active',
              signal_strength: 100,
           }).select('id').single();
           if (!insertErr && newDevice) return newDevice.id;
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

    // Verify HMAC signature for ALL providers (unless using JWT)
    if (!jwtUserId) {
      if (!hmacSig) {
        return jsonResponse({ error: 'All requests must be signed with x-hmac-sig.' }, 401);
      }

      if (!secretKey) {
        return jsonResponse({ error: 'Service/network has no secret key configured. Generate credentials in the dashboard.' }, 403);
      }
      const expectedSig = await hmacSha256(secretKey, bodyText);
      if (!timingSafeEqual(hmacSig.toLowerCase(), expectedSig.toLowerCase())) {
        return jsonResponse({ error: 'HMAC signature verification failed. Ensure you are signing the raw request body with your secret key.' }, 401);
      }
    }

    // ── 4. Fetch Global Config & Process batch ─────────────────
    let bandwidthLimits = {
      default: 100, cloud: 50, streaming: 10, social: 8, ai: 5, browsing: 4, gaming: 0.25
    };
    try {
      const { data: limitsData } = await supabase.from('kv_settings').select('value').eq('key', 'category_bandwidth_limits').maybeSingle();
      if (limitsData?.value) {
        const parsed = typeof limitsData.value === 'string' ? JSON.parse(limitsData.value) : limitsData.value;
        bandwidthLimits = { ...bandwidthLimits, ...parsed };
      }
    } catch (e) {
      console.error('Failed to fetch category limits, using defaults', e);
    }

    const results: Array<Record<string, unknown>> = [];
    let successCount = 0;
    let errorCount = 0;

    // Caching resolved campaign categories to minimize DB queries in batch
    const categoryCache: Record<string, string> = {};

    // First pass: extract all events and filter invalid ones
    const validEvents = [];
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
        gaming_platform = null,
      } = event as Record<string, unknown>;

      let finalCampaignId = campaign_id || autoCampaignId;

      if (!rawDeviceId || !finalCampaignId || !session_id) {
        results.push({
          session_id: session_id || 'unknown',
          status: 'error',
          message: 'Missing required fields: device_id, campaign_id (or no active campaign found), session_id',
        });
        errorCount++;
        continue;
      }
      
      validEvents.push({
        rawDeviceId, finalCampaignId, session_id, bytes_up, bytes_down, duration_seconds, session_start, session_end, gaming_platform
      });
    }

    // Process valid events
    const anomalyInserts: any[] = [];
    const batchRpcPayloads: any[] = [];
    const parallelIspPayloads: any[] = [];

    // Since resolveDeviceId has complex fallback logic, we can still use it.
    // Deno runs this very fast concurrently.
    const resolvedEvents = await Promise.all(validEvents.map(async (ve) => {
      const device_id = await resolveDeviceId(ve.rawDeviceId as string, ve.finalCampaignId as string);
      
      if (!device_id) {
        return { error: `Device not found for fingerprint: ${ve.rawDeviceId}`, ve };
      }

      // Fetch device user_id and isp_name
      let deviceUserId: string | null = null;
      let deviceIspName: string | null = null;
      try {
        const { data: devObj } = await supabase.from('devices').select('user_id, isp_name').eq('id', device_id).maybeSingle();
        if (devObj) {
          deviceUserId = devObj.user_id;
          deviceIspName = devObj.isp_name;
        }
      } catch (e) {
        console.error('Error fetching device user/isp info:', e);
      }

      let category = categoryCache[ve.finalCampaignId as string];
      if (!category) {
        category = await getCampaignCategory(supabase, ve.finalCampaignId as string);
        categoryCache[ve.finalCampaignId as string] = category;
      }

      const validation = validateTelemetry(
        category, Number(ve.bytes_up), Number(ve.bytes_down), Number(ve.duration_seconds), bandwidthLimits
      );

      return {
        device_id, deviceUserId, deviceIspName, category, validation, ve
      };
    }));

    for (const res of resolvedEvents) {
      if (res.error) {
        results.push({ session_id: res.ve.session_id, status: 'error', message: res.error });
        errorCount++;
        continue;
      }

      const { device_id, deviceUserId, deviceIspName, category, validation, ve } = res;

      if (validation.isAnomaly) {
        try {
          const { data: userData } = await supabase.from('devices').select('users(email)').eq('id', device_id).maybeSingle();
          const userEmail = (userData?.users as any)?.email || 'unknown@netreward.online';
          anomalyInserts.push({
            session_id: ve.session_id as string,
            user_email: userEmail,
            flag_type: validation.flagType,
            details: `[Category: ${category.toUpperCase()}] ${validation.details}`,
            status: 'open'
          });
        } catch (e) {}
      }

      batchRpcPayloads.push({
        req_device_fingerprint: ve.rawDeviceId,
        req_campaign_id: ve.finalCampaignId,
        device_id,
        campaign_id: ve.finalCampaignId,
        session_id: ve.session_id,
        bytes_up: Number(ve.bytes_up),
        bytes_down: Number(ve.bytes_down),
        duration_seconds: Number(ve.duration_seconds),
        session_start: (ve.session_start as string) || new Date(Date.now() - Number(ve.duration_seconds) * 1000).toISOString(),
        session_end: (ve.session_end as string) || new Date().toISOString(),
        gaming_platform: ve.gaming_platform as string | null
      });

      if (deviceUserId && deviceIspName) {
        const ispCampaignId = await resolveIspCampaignId(deviceUserId, deviceIspName);
        if (ispCampaignId && ispCampaignId !== ve.finalCampaignId) {
          parallelIspPayloads.push({
            req_device_fingerprint: ve.rawDeviceId,
            req_campaign_id: ispCampaignId,
            device_id,
            campaign_id: ispCampaignId,
            session_id: `${ve.session_id}_isp`,
            bytes_up: Number(ve.bytes_up),
            bytes_down: Number(ve.bytes_down),
            duration_seconds: Number(ve.duration_seconds),
            session_start: (ve.session_start as string) || new Date(Date.now() - Number(ve.duration_seconds) * 1000).toISOString(),
            session_end: (ve.session_end as string) || new Date().toISOString(),
            gaming_platform: null
          });
        }
      }
    }

    if (anomalyInserts.length > 0) {
      await supabase.from('tracking_anomalies').insert(anomalyInserts);
    }

    const allRpcPayloads = [...batchRpcPayloads, ...parallelIspPayloads];
    const trackingSessionInserts: any[] = [];

    if (allRpcPayloads.length > 0) {
      // Execute the massive batch in a single database RPC call!
      const { data: batchResults, error: batchError } = await supabase.rpc('process_tracking_batch', {
        p_events: allRpcPayloads
      });

      if (batchError) {
        console.error('[Batch RPC Error]', batchError);
        throw batchError;
      }

      const rpcArray = (batchResults as Record<string, unknown>[]) || [];
      
      // We need to bulk resolve user emails and campaign names for tracking_sessions
      const uniqueDeviceIds = [...new Set(allRpcPayloads.map(p => p.device_id))];
      const uniqueCampaignIds = [...new Set(allRpcPayloads.map(p => p.campaign_id))];
      
      const { data: devicesInfo } = await supabase.from('devices').select('id, users(email)').in('id', uniqueDeviceIds);
      const deviceEmailMap = new Map((devicesInfo || []).map(d => [d.id, (d.users as any)?.email]));
      
      const { data: campaignsInfo } = await supabase.from('campaigns').select('id, title, sp:sp_profiles(users(email)), isp:isp_profiles(users(email))').in('id', uniqueCampaignIds);
      const campInfoMap = new Map((campaignsInfo || []).map(c => [c.id, c]));

      // Map results
      for (let i = 0; i < allRpcPayloads.length; i++) {
        const payload = allRpcPayloads[i];
        const rpcData = rpcArray[i]; // Maintains order matching payload via PLPGSQL loop mapping if we matched them, but wait, process_tracking_batch iterates over p_events so the output array exactly matches the input array order!

        if (!rpcData) continue;
        
        const isParallelIsp = payload.session_id.endsWith('_isp');

        if (rpcData.status === 'error') {
          if (!isParallelIsp) {
            results.push({ session_id: payload.session_id, status: 'error', message: rpcData.message });
            errorCount++;
          }
          continue;
        }

        if (!isParallelIsp) {
          results.push(rpcData);
          successCount++;
        }

        const userEmail = deviceEmailMap.get(payload.device_id) || 'unknown';
        const campInfo = campInfoMap.get(payload.campaign_id);
        const campaignName = campInfo?.title || String(payload.campaign_id);
        
        let spEmail = '';
        if (!isParallelIsp) {
          const spArr = campInfo?.sp;
          spEmail = spArr ? (Array.isArray(spArr) ? (spArr[0]?.users as any)?.email : (spArr as any)?.users?.email) || '' : '';
        }

        const nrtAwarded = rpcData.status === 'success' ? Number((rpcData.splits as any)?.user ?? 0) : 0;
        const rpcGamingPlatform = rpcData.gaming_platform as string | null || payload.gaming_platform as string | null;
        const rpcGamingUsername = rpcData.gaming_username as string | null;

        let sessionSource = isParallelIsp ? 'isp_sdk' : (providerType === 'isp' ? 'isp_sdk' : 'sdk');
        if (!isParallelIsp && rpcGamingPlatform) sessionSource = `gaming_${rpcGamingPlatform}`;

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

        // Validation score approximation from earlier
        const isAnomaly = anomalyInserts.some(a => a.session_id === payload.session_id);

        trackingSessionInserts.push({
          session_id: payload.session_id,
          user_email: userEmail,
          campaign_name: campaignName,
          sp_email: spEmail,
          source: sessionSource,
          device_ip: rpcGamingUsername ? `[gaming:${rpcGamingUsername}]` : '',
          data_rx_bytes: payload.bytes_down,
          data_tx_bytes: payload.bytes_up,
          duration_seconds: payload.duration_seconds,
          nrt_awarded: nrtAwarded,
          validation_score: isAnomaly ? 0.5 : 1.0,
          status: tsStatus,
          reject_reason: rejectReason,
          service_id: rpcData.service_id || null,
          network_id: rpcData.network_id || (isParallelIsp ? payload.campaign_id : null), // For parallel ISP we default to campaign_id if null
          category: rpcData.category || (isParallelIsp ? 'broadband' : null),
          gaming_account_id: rpcData.gaming_account_id || null,
        });
      }

      if (trackingSessionInserts.length > 0) {
        try {
          // Bulk insert the logs!
          await supabase.from('tracking_sessions').insert(trackingSessionInserts);
        } catch (tsErr) {
          console.error('[tracking_sessions bulk insert failed]', tsErr);
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
