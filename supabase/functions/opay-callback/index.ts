import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * OPay Callback Webhook Handler
 * 
 * OPay sends POST requests to this endpoint when payment status changes.
 * Payload structure:
 * {
 *   "payload": { "reference", "status", "amount", "transactionId", ... },
 *   "sha512": "signature",
 *   "type": "transaction-status"
 * }
 */
serve(async (req) => {
  // OPay callbacks are unauthenticated POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { payload, sha512, type } = body;

    if (type !== 'transaction-status' || !payload) {
      console.warn('Unexpected callback type:', type);
      return new Response('OK', { status: 200 });
    }

    const { reference, status, transactionId, amount, currency } = payload;

    if (!reference) {
      console.error('Missing reference in callback payload');
      return new Response('OK', { status: 200 });
    }

    // Fetch secret key for signature verification
    const { data: secretSetting } = await supabase
      .from('kv_settings')
      .select('value')
      .eq('key', 'opay_secret_key')
      .single();

    const secretKey = secretSetting?.value;

    // Verify HMAC-SHA512 signature if secret key is configured
    if (secretKey && sha512) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
      );

      const payloadStr = JSON.stringify(payload);
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadStr)
      );

      const computedHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (computedHex !== sha512) {
        console.error('Signature verification failed!');
        console.error('Expected:', sha512);
        console.error('Computed:', computedHex);
        // In sandbox mode, log but don't reject (OPay sandbox signatures may differ)
        const { data: envSetting } = await supabase
          .from('kv_settings')
          .select('value')
          .eq('key', 'opay_environment')
          .single();

        if (envSetting?.value === 'production') {
          return new Response('Invalid signature', { status: 403 });
        }
        console.warn('Signature mismatch ignored in sandbox mode');
      }
    }

    console.log(`OPay callback for reference ${reference}: status=${status}`);

    // Map OPay status to our internal status
    let internalStatus: string;
    switch (status) {
      case 'SUCCESS':
        internalStatus = 'SUCCESS';
        break;
      case 'FAIL':
      case 'FAILED':
        internalStatus = 'FAIL';
        break;
      case 'CLOSE':
      case 'CLOSED':
        internalStatus = 'CLOSE';
        break;
      case 'PENDING':
        internalStatus = 'PENDING';
        break;
      default:
        internalStatus = 'PENDING';
    }

    // Update opay_payments record
    const { error: updateError } = await supabase
      .from('opay_payments')
      .update({
        status: internalStatus,
        opay_transaction_id: transactionId || null,
        callback_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (updateError) {
      console.error('Failed to update opay_payments:', updateError);
    }

    // If payment was successful, credit the user's wallet
    if (internalStatus === 'SUCCESS') {
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('complete_opay_payment', {
          p_reference: reference,
          p_opay_transaction_id: transactionId || '',
          p_callback_payload: payload,
        });

      if (rpcError) {
        console.error('Failed to complete OPay payment RPC:', rpcError);
      } else {
        console.log('OPay payment completed successfully:', rpcResult);
      }
    }

    // Always respond 200 to acknowledge the callback
    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('opay-callback error:', error);
    // Still return 200 to prevent OPay from retrying
    return new Response('OK', { status: 200 });
  }
});
