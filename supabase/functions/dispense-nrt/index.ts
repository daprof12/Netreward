import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Connection, Keypair, PublicKey, Transaction } from "npm:@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_2022_PROGRAM_ID } from "npm:@solana/spl-token";
import bs58 from "npm:bs58";
import { createClient } from "npm:@supabase/supabase-js";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || 'https://netreward.app';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { amount_nrt, solana_address, nrt_mint_address, user_id, wallet_id } = await req.json();

    if (!amount_nrt || !solana_address || !nrt_mint_address || !user_id || !wallet_id) {
      throw new Error('Missing required parameters');
    }

    // 1. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Setup Solana Connection & Hot Wallet
    const rpcUrl = Deno.env.get('SOLANA_RPC_URL') || 'https://solana-rpc.publicnode.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const secretKeyString = Deno.env.get('TREASURY_SECRET_KEY');
    if (!secretKeyString) throw new Error('TREASURY_SECRET_KEY not configured on server');
    
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
    const mintPubkey = new PublicKey(nrt_mint_address);
    const destinationPubkey = new PublicKey(solana_address);
    
    // Amount is 9 decimals
    const transferAmount = BigInt(Math.floor(Number(amount_nrt) * 1e9));

    // 3. Prepare Token Accounts
    const sourceAta = getAssociatedTokenAddressSync(mintPubkey, treasuryKeypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
    const destinationAta = getAssociatedTokenAddressSync(mintPubkey, destinationPubkey, false, TOKEN_2022_PROGRAM_ID);

    const transaction = new Transaction();

    // Check if user has an ATA, if not, create one for them
    const destAtaInfo = await connection.getAccountInfo(destinationAta);
    if (!destAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey, // Payer
          destinationAta, // ATA
          destinationPubkey, // Owner
          mintPubkey, // Mint
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // 4. Add Transfer Instruction
    transaction.add(
      createTransferInstruction(
        sourceAta,
        destinationAta,
        treasuryKeypair.publicKey,
        transferAmount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    // 5. Send Transaction
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;
    
    transaction.sign(treasuryKeypair);
    const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });

    // 6. Confirm Transaction
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) throw new Error('Transaction failed on-chain');

    // 7. Deduct the off-chain balance so it doesn't double-count
    // (Because process_instant_purchase initially credited the platform wallet)
    await supabase.rpc('deduct_wallet_balance', {
      p_wallet_id: wallet_id,
      p_amount: amount_nrt
    });

    // 8. Log the on-chain withdrawal
    await supabase.from('transactions').insert({
      wallet_id: wallet_id,
      amount: amount_nrt,
      tx_type: 'withdrawal',
      description: 'On-chain fulfillment for Instant Purchase',
      status: 'completed',
      tx_hash: signature
    });

    return new Response(
      JSON.stringify({ success: true, signature }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
