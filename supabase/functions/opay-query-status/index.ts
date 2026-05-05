import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * OPay Query Payment Status
 * Admin-callable function to verify payment status directly with OPay API.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) throw new Error('Unauthorized');

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') throw new Error('Admin access required');

    const { reference, order_no } = await req.json();
    if (!reference && !order_no) throw new Error('Reference or order_no required');

    // Fetch OPay config
    const { data: settings } = await supabase
      .from('kv_settings')
      .select('key, value')
      .in('key', ['opay_merchant_id', 'opay_public_key', 'opay_environment']);

    const config: Record<string, string> = {};
    (settings || []).forEach((s: any) => { config[s.key] = s.value; });

    const merchantId = config.opay_merchant_id;
    const publicKey = config.opay_public_key;
    const environment = config.opay_environment || 'sandbox';

    if (!merchantId || !publicKey) {
      throw new Error('OPay credentials not configured');
    }

    const apiBase = environment === 'production'
      ? 'https://api.opaycheckout.com'
      : 'https://sandboxapi.opaycheckout.com';

    // Query OPay status API
    const queryPayload: any = { country: 'NG' };
    if (reference) queryPayload.reference = reference;
    if (order_no) queryPayload.orderNo = order_no;

    const opayResponse = await fetch(`${apiBase}/api/v1/international/cashier/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicKey}`,
        'MerchantId': merchantId,
      },
      body: JSON.stringify(queryPayload),
    });

    const opayResult = await opayResponse.json();

    // If OPay returns a definitive status, update our local record
    if (opayResult.code === '00000' && opayResult.data) {
      const opayStatus = opayResult.data.status;

      await supabase
        .from('opay_payments')
        .update({
          status: opayStatus,
          opay_transaction_id: opayResult.data.transactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);

      // If we discover a SUCCESS that we missed, process it
      if (opayStatus === 'SUCCESS') {
        const { data: existing } = await supabase
          .from('opay_payments')
          .select('status')
          .eq('reference', reference)
          .single();

        if (existing && existing.status !== 'SUCCESS') {
          await supabase.rpc('complete_opay_payment', {
            p_reference: reference,
            p_opay_transaction_id: opayResult.data.transactionId || '',
            p_callback_payload: opayResult.data,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      opay_response: opayResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('opay-query-status error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
