import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── HMAC helpers ─────────────────────────────────────────────────────────────
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

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase client');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the payload from pg_net / Database Webhook
    const body = await req.json();
    const { type, table, record, old_record } = body;

    // Only proceed if it's an update to scan2pay_sessions where status changed to 'completed'
    if (table !== 'scan2pay_sessions' || type !== 'UPDATE') {
      return new Response('Not a scan2pay_sessions update', { status: 200 });
    }

    if (record.status !== 'completed' || old_record?.status === 'completed') {
      return new Response('Status is not newly completed', { status: 200 });
    }

    const merchantId = record.merchant_id;
    if (!merchantId) {
      return new Response('No merchant_id found', { status: 200 });
    }

    // Determine the merchant's role (sp or isp)
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', merchantId)
      .single();

    if (!userRow) {
      return new Response('Merchant user not found', { status: 200 });
    }

    let webhookUrl = '';
    let webhookSecret = '';

    if (userRow.role === 'sp') {
      // Look up SP profile -> services
      const { data: services } = await supabase
        .from('services')
        .select('webhook_url, webhook_secret')
        .eq('sp_id', (await supabase.from('sp_profiles').select('id').eq('user_id', merchantId).single()).data?.id || '')
        .limit(1);
      
      if (services && services.length > 0) {
        webhookUrl = services[0].webhook_url || '';
        webhookSecret = services[0].webhook_secret || '';
      }
    } else if (userRow.role === 'isp') {
      // Look up ISP profile -> networks
      const { data: networks } = await supabase
        .from('networks')
        .select('webhook_url, webhook_secret')
        .eq('isp_id', (await supabase.from('isp_profiles').select('id').eq('user_id', merchantId).single()).data?.id || '')
        .limit(1);
      
      if (networks && networks.length > 0) {
        webhookUrl = networks[0].webhook_url || '';
        webhookSecret = networks[0].webhook_secret || '';
      }
    }

    if (!webhookUrl) {
      console.log(`No webhook URL configured for merchant ${merchantId}. Skipping dispatch.`);
      return new Response('No webhook URL configured', { status: 200 });
    }

    // Construct the payload to send to the merchant
    const payload = {
      event: 'payment.completed',
      data: {
        session_id: record.id,
        amount_nrt: record.amount_nrt,
        paid_by: record.paid_by,
        metadata: record.metadata,
        transaction_id: record.transaction_id,
        created_at: record.created_at,
        is_subscription: record.is_subscription
      }
    };

    const payloadString = JSON.stringify(payload);

    // Sign the payload if they have a secret configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (webhookSecret) {
      const signature = await hmacSha256(webhookSecret, payloadString);
      headers['x-nrt-signature'] = `hmac-sha256=${signature}`;
    }

    console.log(`Dispatching webhook to ${webhookUrl} for session ${record.id}`);

    // Send the request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString
    });

    if (!response.ok) {
      console.error(`Merchant webhook returned ${response.status}: ${await response.text()}`);
    } else {
      console.log(`Webhook successfully delivered to ${webhookUrl}`);
    }

    return new Response('Webhook dispatched', { status: 200 });
  } catch (error: any) {
    console.error('Error dispatching webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
