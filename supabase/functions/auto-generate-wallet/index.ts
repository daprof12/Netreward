import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Keypair } from 'https://esm.sh/@solana/web3.js@1.87.6';
import * as nacl from 'https://esm.sh/tweetnacl@1.0.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * auto-generate-wallet
 * 
 * Triggered by a Database Webhook when a new row is inserted into 'public.wallets'.
 * Generates a Solana keypair and updates the record immediately.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Database webhooks send the row data in the body
    const body = await req.json();
    const { record } = body;
    
    if (!record || !record.user_id) {
      throw new Error('No record or user_id found in webhook payload');
    }

    const userId = record.user_id;
    console.log(`Generating wallet for user: ${userId}`);

    // 1. Check if wallet already has a key to avoid duplicates
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('solana_public_key')
      .eq('user_id', userId)
      .single();

    if (existingWallet?.solana_public_key) {
      return new Response(JSON.stringify({ message: 'Wallet already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate Solana Keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = Array.from(keypair.secretKey);

    // 3. Update the wallet record
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        solana_public_key: publicKey,
        // For simplicity in this auto-generator, we store as JSON array.
        // In a production environment, you should encrypt this using a master key.
        encrypted_private_key: JSON.stringify(privateKey),
        wallet_type: 'custodial',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    console.log(`Successfully generated wallet for ${userId}: ${publicKey}`);

    return new Response(JSON.stringify({ success: true, publicKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('auto-generate-wallet error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
