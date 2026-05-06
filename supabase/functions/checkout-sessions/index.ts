import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sp-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`[checkout-sessions] Request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Extract API Key (from x-sp-api-key or Authorization)
    const apiKey = req.headers.get('x-sp-api-key') || 
                   req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Lookup Service/SP
    let merchantUserId: string | null = null;
    let serviceName = 'NetReward Checkout';
    let spEmail = '';
    let spName = '';

    // First check the new sp_api_keys table (Centralized Keys)
    const { data: centralKey } = await supabase
      .from('sp_api_keys')
      .select('sp_email, sdk_key, payment_key')
      .or(`sdk_key.eq.${apiKey},payment_key.eq.${apiKey}`)
      .maybeSingle();

    if (centralKey) {
      // Find the SP profile by email
      const { data: userRecord } = await supabase
        .from('users')
        .select('id, sp_profiles(id, company_name)')
        .eq('email', centralKey.sp_email)
        .maybeSingle();

      if (userRecord) {
        merchantUserId = userRecord.id;
        spEmail = centralKey.sp_email;
        spName = (userRecord.sp_profiles as any)?.[0]?.company_name || 'Service Provider';
        serviceName = spName;
      } else {
        // Fallback: If the API key is valid but the user isn't in the DB (e.g. testing),
        // we fallback to an admin user ID so the foreign key constraint doesn't fail.
        const { data: adminRecord } = await supabase
          .from('users')
          .select('id')
          .in('role', ['admin', 'sp'])
          .limit(1)
          .maybeSingle();

        merchantUserId = adminRecord?.id || null;
        spEmail = centralKey.sp_email;
        spName = 'Service Provider';
        serviceName = spName;
      }
    }

    // Fallback: Check the legacy services/sp_profiles tables if not found in centralized table
    if (!merchantUserId) {
      // Check services table (Legacy SDK key)
      let { data: service } = await supabase
        .from('services')
        .select('id, sp_id, name, api_key')
        .eq('api_key', apiKey)
        .maybeSingle();

      if (service) {
        const { data: spData } = await supabase
          .from('sp_profiles')
          .select('user_id, company_name, users!user_id(email)')
          .eq('id', service.sp_id)
          .single();
        
        merchantUserId = spData?.user_id || null;
        serviceName = service.name;
        spName = spData?.company_name || '';
        spEmail = (spData?.users as any)?.email || '';
      } else {
        // Check sp_profiles table (Legacy Payment API key)
        const { data: spData } = await supabase
          .from('sp_profiles')
          .select('user_id, company_name, users!user_id(email)')
          .eq('payment_api_key', apiKey)
          .maybeSingle();
        
        if (spData) {
          merchantUserId = spData.user_id;
          serviceName = spData.company_name;
          spName = spData.company_name;
          spEmail = (spData?.users as any)?.email || '';
        }
      }
    }

    if (!merchantUserId) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2.5 Ensure Integration exists in checkout_integrations for Admin Dashboard
    try {
      const { data: existingInt } = await supabase
        .from('checkout_integrations')
        .select('id')
        .eq('service_name', serviceName)
        .maybeSingle();

      if (!existingInt) {
        await supabase.from('checkout_integrations').insert({
          sp_name: spName,
          sp_email: spEmail,
          service_name: serviceName,
          category: 'Other',
          status: 'active',
          volume_nrt: 0,
          tx_count: 0
        });
      }
    } catch (e) {
      console.error('Failed to register integration:', e);
    }

    // 3. Parse Request Body
    const body = await req.json();
    const amount = body.amount ?? body.totalAmount;
    const { currency = 'USD', description, metadata = {}, success_url, cancel_url } = body;

    if (!amount || isNaN(Number(amount))) {
      return new Response(JSON.stringify({ error: 'Valid amount is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 4. Convert Amount to NRT
    let nrtAmount = Number(amount);
    if (currency !== 'NRT') {
      const { data: tokenConfig } = await supabase
        .from('kv_settings')
        .select('value')
        .eq('key', 'token_config')
        .maybeSingle();
      
      let price = 0.005;
      if (tokenConfig?.value) {
        const parsed = typeof tokenConfig.value === 'string' ? JSON.parse(tokenConfig.value) : tokenConfig.value;
        if (parsed?.currentValue) price = Number(parsed.currentValue);
      }
      nrtAmount = Number(amount) / price;
    }

    // 5. Create Session
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: session, error: sessionError } = await supabase
      .from('scan2pay_sessions')
      .insert({
        merchant_id: merchantUserId,
        amount_nrt: nrtAmount,
        description: description || `Payment to ${serviceName}`,
        status: 'pending',
        expires_at: expiresAt,
        metadata: metadata,
        success_url: success_url,
        cancel_url: cancel_url
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 6. Increment Transaction Count in checkout_integrations
    try {
      await supabase.rpc('increment_integration_tx', { 
        p_service_name: serviceName, 
        p_status: 'pending' 
      });
    } catch (e) {
      console.error('Failed to update integration stats:', e);
    }

    return new Response(JSON.stringify({
      id: session.id,
      checkout_url: `https://netreward.online/pay?session=${session.id}`,
      status: 'pending',
      amount_nrt: nrtAmount
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
