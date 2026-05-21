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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Dynamic SDK Initialization endpoint
    try {
      const spApiKey = req.headers.get('x-sp-api-key');
      if (!spApiKey) {
        return jsonResponse({ error: 'Missing x-sp-api-key' }, 401);
      }
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Try centralized keys first
      let category = 'other';
      const { data: centralKey } = await supabase
        .from('sp_api_keys')
        .select('sp_email')
        .eq('sdk_key', spApiKey)
        .maybeSingle();
        
      if (centralKey) {
        // If they use centralized keys, they might not have a specific 'service' with a category.
        // We default to 'other' or could look up their sp_profile category.
        category = 'other';
      } else {
        // Try legacy services table
        const { data: service } = await supabase
          .from('services')
          .select('category')
          .eq('api_key', spApiKey)
          .maybeSingle();
        if (service && service.category) {
          category = service.category.toLowerCase();
        }
      }

      return jsonResponse({ category });
    } catch (err) {
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
    const spApiKey = req.headers.get('x-sp-api-key');
    const ispApiKey = req.headers.get('x-isp-api-key');
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
        .select('webhook_secret, status')
        .eq('sdk_key', spApiKey)
        .maybeSingle();

      if (centralKey) {
        if (centralKey.status !== 'active') {
          return jsonResponse({ error: `SP account is ${centralKey.status}` }, 403);
        }
        secretKey = centralKey.webhook_secret;
      } else {
        // 2. Fallback to legacy services table
        const { data: service, error } = await supabase
          .from('services')
          .select('id, sp_id, secret_key, status')
          .eq('api_key', spApiKey)
          .single();

        if (error || !service) {
          return jsonResponse({ error: 'Invalid SP API key' }, 401);
        }

        if (service.status !== 'active') {
          return jsonResponse({ error: `Service is ${service.status}` }, 403);
        }

        secretKey = service.secret_key;
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
          .select('id, isp_id, api_secret, verified')
          .eq('api_key', ispApiKey)
          .single();

        if (error || !network) {
          return jsonResponse({ error: 'Invalid ISP API key' }, 401);
        }

        if (!network.verified) {
          return jsonResponse({ error: 'Network is not verified' }, 403);
        }

        secretKey = network.api_secret;
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
        device_id,
        campaign_id,
        session_id,
        bytes_up = 0,
        bytes_down = 0,
        duration_seconds = 60,
        session_start,
        session_end,
      } = event as Record<string, unknown>;

      let finalCampaignId = campaign_id || autoCampaignId;

      // Validate required fields
      if (!device_id || !finalCampaignId || !session_id) {
        results.push({
          session_id: session_id || 'unknown',
          status: 'error',
          message: 'Missing required fields: device_id, campaign_id (or no active campaign found), session_id',
        });
        errorCount++;
        continue;
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
      });

      if (error) {
        results.push({
          session_id,
          status: 'error',
          message: error.message,
        });
        errorCount++;
      } else {
        results.push(data as Record<string, unknown>);
        successCount++;
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
