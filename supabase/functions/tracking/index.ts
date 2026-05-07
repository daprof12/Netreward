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

  // Only POST allowed
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

    // ── 3. Lookup API key and verify HMAC ──────────────────────
    let secretKey: string | null = null;
    let providerType: 'sp' | 'isp' = 'sp';

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
      }
      providerType = 'isp';
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

      // Validate required fields
      if (!device_id || !campaign_id || !session_id) {
        results.push({
          session_id: session_id || 'unknown',
          status: 'error',
          message: 'Missing required fields: device_id, campaign_id, session_id',
        });
        errorCount++;
        continue;
      }

      // Call the Reward Engine RPC
      const { data, error } = await supabase.rpc('process_tracking_report', {
        p_device_id: device_id,
        p_campaign_id: campaign_id,
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
