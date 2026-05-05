import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate the user from the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) throw new Error('Unauthorized');

    // Parse request body
    const { amount_fiat, amount_nrt, currency, pay_method, fee_fiat, user_email, user_name } = await req.json();

    if (!amount_fiat || amount_fiat <= 0) throw new Error('Invalid amount');

    // Fetch OPay config from kv_settings
    const { data: settings } = await supabase
      .from('kv_settings')
      .select('key, value')
      .in('key', ['opay_merchant_id', 'opay_public_key', 'opay_environment', 'opay_callback_url']);

    const config: Record<string, string> = {};
    (settings || []).forEach((s: any) => { config[s.key] = s.value; });

    const merchantId = config.opay_merchant_id;
    const publicKey = config.opay_public_key;
    const environment = config.opay_environment || 'sandbox';
    const callbackUrl = config.opay_callback_url || `${supabaseUrl}/functions/v1/opay-callback`;

    if (!merchantId || !publicKey) {
      throw new Error('OPay credentials not configured. Please set opay_merchant_id and opay_public_key in admin settings.');
    }

    // Determine API base URL
    const apiBase = environment === 'production'
      ? 'https://api.opaycheckout.com'
      : 'https://sandboxapi.opaycheckout.com';

    // Generate unique reference with NRT prefix
    const reference = `NRT-${user.id.slice(0, 8)}-${Date.now()}`;

    // Determine return URLs
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://netreward.app';
    const returnUrl = `${appUrl}/wallet/deposit/opay-return?ref=${reference}`;
    const cancelUrl = `${appUrl}/wallet/deposit/instant?cancelled=true`;

    // OPay uses cent units for amounts (multiply by 100)
    const amountInCents = Math.round(amount_fiat * 100);

    // Build OPay Cashier Create payload
    const opayPayload = {
      country: 'NG',
      reference,
      amount: {
        total: amountInCents,
        currency: currency || 'NGN',
      },
      returnUrl,
      callbackUrl,
      cancelUrl,
      expireAt: 1800, // 30 minutes
      userInfo: {
        userEmail: user_email || user.email || '',
        userId: user.id,
        userName: user_name || '',
      },
      productList: [
        {
          productId: 'nrt-token',
          name: 'NRT Token Purchase',
          description: `Purchase ${amount_nrt?.toFixed(2) || '0'} NRT tokens`,
          price: amountInCents,
          quantity: 1,
          imageUrl: `${appUrl}/icon-192.png`,
        }
      ],
      // Leave payMethod blank to show all available options on OPay checkout
      ...(pay_method ? { payMethod: pay_method } : {}),
    };

    // Call OPay Cashier Create API
    const opayResponse = await fetch(`${apiBase}/api/v1/international/cashier/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicKey}`,
        'MerchantId': merchantId,
      },
      body: JSON.stringify(opayPayload),
    });

    const opayResult = await opayResponse.json();

    if (opayResult.code !== '00000') {
      throw new Error(`OPay error: ${opayResult.message || 'Unknown error'} (code: ${opayResult.code})`);
    }

    // Store the pending payment in our database
    const { error: insertError } = await supabase
      .from('opay_payments')
      .insert({
        user_id: user.id,
        reference,
        order_no: opayResult.data?.orderNo || null,
        amount_fiat: amount_fiat,
        amount_nrt: amount_nrt || 0,
        currency: currency || 'NGN',
        pay_method: pay_method || null,
        status: 'INITIAL',
        cashier_url: opayResult.data?.cashierUrl || null,
        fee_fiat: fee_fiat || 0,
        provider_name: 'OPay',
      });

    if (insertError) {
      console.error('Failed to store OPay payment:', insertError);
      // Non-fatal — the payment was created on OPay side, we should still redirect
    }

    return new Response(JSON.stringify({
      success: true,
      cashierUrl: opayResult.data?.cashierUrl,
      reference,
      orderNo: opayResult.data?.orderNo,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('opay-create-payment error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to create payment',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
