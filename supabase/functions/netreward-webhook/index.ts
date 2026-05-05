/**
 * NetReward Webhook — Supabase Edge Function (Deno runtime)
 *
 * Receives payment event POSTs from the NetReward platform, verifies the
 * HMAC-SHA256 signature (X-NRT-Signature header), and processes events.
 *
 * Supported events:
 *   payment.completed  → insert transactions row, optionally update user tier
 *   payment.failed     → log the failure
 *
 * Setup:
 *   supabase secrets set NRT_WEBHOOK_SECRET=whsec_4979c51a1bc3472abae944aeea56187f
 *   supabase functions deploy netreward-webhook
 *
 * Register this URL in the NetReward Dashboard → Settings → Webhooks:
 *   https://<project-ref>.supabase.co/functions/v1/netreward-webhook
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-nrt-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── HMAC helpers (Deno — same Web Crypto API as the browser) ─────────────────

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time compare — prevents timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Response helper ───────────────────────────────────────────────────────────

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Event handlers ────────────────────────────────────────────────────────────

type NrtEvent = {
  id: string;
  type: string;
  created: number;
  data: Record<string, unknown>;
};

async function handlePaymentCompleted(
  supabase: ReturnType<typeof createClient>,
  event: NrtEvent,
) {
  const d = event.data;

  // Map NetReward user ID to our internal user
  const nrtUserId = d.nrt_user_id as string | undefined;
  const orderId   = d.order_id   as string | undefined;
  const amount    = d.amount     as number | undefined;
  const currency  = (d.currency  as string) || 'NRT';
  const itemType  = (d.item_type as string) || 'unknown'; // 'subscription' | 'merch'

  if (!nrtUserId) {
    console.error('[NRT Webhook] payment.completed missing nrt_user_id', event);
    return;
  }

  // Look up internal user by nrt_user_id stored in their profile metadata
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('nrt_user_id', nrtUserId)
    .maybeSingle();

  if (userErr || !user) {
    console.error('[NRT Webhook] Could not resolve nrt_user_id →', nrtUserId);
    return;
  }

  // Insert transaction record
  const { error: txErr } = await supabase.from('transactions').insert({
    user_id:    user.id,
    type:       itemType,
    amount:     amount ?? 0,
    currency,
    status:     'completed',
    provider:   'netreward',
    reference:  orderId ?? event.id,
    metadata:   { nrt_event_id: event.id, ...d },
  });

  if (txErr) {
    console.error('[NRT Webhook] Failed to insert transaction:', txErr.message);
  }

  // If it was a subscription payment, upgrade the user tier
  if (itemType === 'subscription') {
    const tier = (d.plan as string) || 'pro';
    const { error: tierErr } = await supabase
      .from('users')
      .update({ tier, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (tierErr) {
      console.error('[NRT Webhook] Failed to update tier:', tierErr.message);
    } else {
      console.log(`[NRT Webhook] User ${user.id} upgraded to tier: ${tier}`);
    }
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  event: NrtEvent,
) {
  const d = event.data;
  console.warn('[NRT Webhook] payment.failed event received:', {
    event_id:    event.id,
    nrt_user_id: d.nrt_user_id,
    order_id:    d.order_id,
    reason:      d.failure_reason,
  });

  // Optionally log as a failed transaction for audit trail
  const nrtUserId = d.nrt_user_id as string | undefined;
  if (!nrtUserId) return;

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('nrt_user_id', nrtUserId)
    .maybeSingle();

  if (!user) return;

  await supabase.from('transactions').insert({
    user_id:   user.id,
    type:      (d.item_type as string) || 'unknown',
    amount:    (d.amount as number) || 0,
    currency:  (d.currency as string) || 'NRT',
    status:    'failed',
    provider:  'netreward',
    reference: (d.order_id as string) ?? event.id,
    metadata:  { nrt_event_id: event.id, failure_reason: d.failure_reason },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const webhookSecret = Deno.env.get('NRT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[NRT Webhook] NRT_WEBHOOK_SECRET env var is not set');
      return json({ error: 'Webhook secret not configured' }, 500);
    }

    // ── 1. Read raw body BEFORE parsing — HMAC must be over exact bytes ──────
    const rawBody = await req.text();

    // ── 2. Verify HMAC-SHA256 signature ──────────────────────────────────────
    const receivedSig = req.headers.get('x-nrt-signature') ?? '';
    const expectedSig = `hmac-sha256=${await hmacSha256(webhookSecret, rawBody)}`;

    if (!timingSafeEqual(receivedSig, expectedSig)) {
      console.warn('[NRT Webhook] Signature mismatch — rejecting request');
      return json({ error: 'Invalid signature' }, 400);
    }

    // ── 3. Parse event ────────────────────────────────────────────────────────
    let event: NrtEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON payload' }, 400);
    }

    if (!event.type || !event.id) {
      return json({ error: 'Missing event.type or event.id' }, 400);
    }

    // ── 4. Create Supabase client (service role — bypasses RLS) ──────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── 5. Route event ────────────────────────────────────────────────────────
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentCompleted(supabase, event);
        break;
      case 'payment.failed':
        await handlePaymentFailed(supabase, event);
        break;
      default:
        // Unknown event — acknowledge so NetReward doesn't retry
        console.log(`[NRT Webhook] Unhandled event type: ${event.type}`);
    }

    return json({ received: true, event_id: event.id });

  } catch (err) {
    console.error('[NRT Webhook] Unexpected error:', err);
    return json({ error: (err as Error).message ?? 'Internal error' }, 500);
  }
});
