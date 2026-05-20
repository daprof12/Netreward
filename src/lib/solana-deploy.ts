import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeMetadataPointerInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import {
  createInitializeInstruction as createInitializeMetadataInstruction,
  pack,
  TOKEN_METADATA_DISCRIMINATOR,
} from '@solana/spl-token-metadata';

export type { TokenLaunchConfig } from './solana-types';

/**
 * Polls getSignatureStatus until confirmed, errored, or timed out.
 * Fallback for when WebSocket-based confirmTransaction throws.
 */
async function waitForConfirmation(
  connection: Connection,
  signature: string,
  onProgress: (msg: string) => void,
  label = 'TX',
  maxAttempts = 60,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, delayMs));
    const { value } = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (value) {
      if (value.err) {
        throw new Error(`${label} failed on-chain: ${JSON.stringify(value.err)}`);
      }
      if (
        value.confirmationStatus === 'confirmed' ||
        value.confirmationStatus === 'finalized'
      ) {
        onProgress(`✓ ${label} confirmed.`);
        return;
      }
    }
    if (attempt % 5 === 0) {
      onProgress(`Still waiting for ${label}... (${attempt}/${maxAttempts})`);
    }
  }
  throw new Error(
    `${label} not confirmed after ${(maxAttempts * delayMs) / 1000}s. Sig: ${signature}. Check Solana Explorer — it may still land.`
  );
}

async function sendAndConfirm(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  onProgress: (msg: string) => void,
  label: string,
  partialSigners: Keypair[] = []
): Promise<string> {
  const bh = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer;
  for (const kp of partialSigners) tx.partialSign(kp);

  const signed = await signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 5,
  });
  onProgress(`${label} sent: ${sig.slice(0, 20)}... Confirming...`);

  try {
    const result = await connection.confirmTransaction(
      { signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
      'confirmed'
    );
    if (result.value.err) {
      throw new Error(`${label} failed: ${JSON.stringify(result.value.err)}`);
    }
    onProgress(`✓ ${label} confirmed.`);
  } catch {
    onProgress(`WebSocket timeout — polling for ${label}...`);
    await waitForConfirmation(connection, sig, onProgress, label);
  }
  return sig;
}

/**
 * Deploys the NRT token using SPL Token-2022.
 *
 * Three-transaction flow:
 *   TX1 — Create Mint: allocate + init extensions + init mint
 *   TX2 — Init Metadata: transfer rent + write name/symbol/uri into mint
 *   TX3 — Distribute:   create ATAs + mintTo buckets + transfer authority
 */
export async function deployNRT(
  connection: Connection,
  payer: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  config: TokenLaunchConfig,
  onProgress: (msg: string) => void
) {
  try {
    onProgress('Generating Mint Keypair...');
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // ── Space Calculation ──────────────────────────────────────────────────
    // Fixed-size extensions only — TokenMetadata (type 19) is variable-length
    // and must NOT be passed to getMintLen.
    const fixedExtensions: ExtensionType[] = [
      ExtensionType.TransferFeeConfig,
      ExtensionType.MetadataPointer,
    ];
    if (config.interestRate > 0) fixedExtensions.push(ExtensionType.InterestBearingConfig);

    // TX1 allocates only the fixed-extension space. Metadata space is funded
    // via a SystemProgram.transfer in TX2 (canonical Token-2022 pattern).
    const mintLen = getMintLen(fixedExtensions);
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    // Pre-compute metadata fields for TX2 rent estimation
    const tokenMetadata = {
      updateAuthority: payer,
      mint,
      name: config.name,
      symbol: config.symbol,
      uri: config.uri || 'https://arweave.net/metadata.json',
      additionalMetadata: [] as [string, string][],
    };

    // pack() does NOT include the 8-byte TOKEN_METADATA_DISCRIMINATOR prefix.
    // The on-chain program writes [discriminant(8) + packed_data] so we must
    // account for those 8 bytes in the rent calculation.
    const metadataPackedLen = TOKEN_METADATA_DISCRIMINATOR.length + pack(tokenMetadata).length;
    // TLV header = 2 bytes (type) + 2 bytes (length) = 4 bytes
    const totalMintLenWithMeta = mintLen + 4 + metadataPackedLen;
    const totalLamportsNeeded = await connection.getMinimumBalanceForRentExemption(totalMintLenWithMeta);
    const metadataRentTopUp = totalLamportsNeeded - mintLamports;

    // ── TX1: Create + Initialise Mint ────────────────────────────────────
    onProgress('Creating Mint Account (TX 1 of 3)...');

    const tx1 = new Transaction();
    tx1.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }));

    // 1. Allocate account
    tx1.add(SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }));

    // 2. Pre-mint: Transfer Fee extension
    tx1.add(createInitializeTransferFeeConfigInstruction(
      mint, payer, payer,
      config.transferFeeBasisPoints,
      BigInt(config.maxTransferFee),
      TOKEN_2022_PROGRAM_ID
    ));

    // 3. Pre-mint: Metadata Pointer (register that metadata lives on the mint itself)
    tx1.add(createInitializeMetadataPointerInstruction(
      mint, payer, mint, TOKEN_2022_PROGRAM_ID
    ));

    // 4. Pre-mint: Interest Bearing (optional)
    if (config.interestRate > 0) {
      tx1.add(createInitializeInterestBearingMintInstruction(
        mint, payer, config.interestRate, TOKEN_2022_PROGRAM_ID
      ));
    }

    // 5. Finalise the mint — MUST be last pre-metadata instruction
    tx1.add(createInitializeMintInstruction(
      mint, config.decimals, payer, payer, TOKEN_2022_PROGRAM_ID
    ));

    const sig1 = await sendAndConfirm(
      connection, tx1, payer, signTransaction, onProgress, 'Mint TX', [mintKeypair]
    );
    onProgress(`✓ Mint created: ${mint.toBase58()}`);

    // ── TX2: Initialize Token Metadata ───────────────────────────────────
    // The metadata instruction MUST run in a separate transaction AFTER the
    // mint is confirmed on-chain. We also top-up the mint's lamport balance
    // to cover the additional rent for the metadata bytes.
    onProgress('Initializing Token Metadata (TX 2 of 3)...');

    const tx2 = new Transaction();
    tx2.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }));

    // Transfer additional rent so the mint can hold the metadata data
    if (metadataRentTopUp > 0) {
      tx2.add(SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: mint,
        lamports: metadataRentTopUp,
      }));
    }

    // Write TokenMetadata content into the finalized mint account
    tx2.add(createInitializeMetadataInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: payer,
      mint,
      mintAuthority: payer,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      uri: tokenMetadata.uri,
    }));

    await sendAndConfirm(
      connection, tx2, payer, signTransaction, onProgress, 'Metadata TX'
    );
    onProgress('✓ Token metadata initialized.');

    // ── TX3: Distribute Supply + Transfer Authority ───────────────────────
    const tx3 = new Transaction();
    tx3.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }));
    let hasTx3Actions = false;
    const createdAtas = new Set<string>();

    for (const bucket of config.treasuryBuckets) {
      if (!bucket.address || bucket.percentage <= 0) continue;
      onProgress(`Preparing distribution → ${bucket.name} (${bucket.percentage}%)...`);

      try {
        const recipient = new PublicKey(bucket.address);
        const ata = getAssociatedTokenAddressSync(mint, recipient, false, TOKEN_2022_PROGRAM_ID);
        const ataKey = ata.toBase58();

        if (!createdAtas.has(ataKey)) {
          tx3.add(createAssociatedTokenAccountInstruction(
            payer, ata, recipient, mint, TOKEN_2022_PROGRAM_ID
          ));
          createdAtas.add(ataKey);
        }

        const bucketAmount = Math.floor(config.initialSupply * (bucket.percentage / 100));
        const rawAmount = BigInt(bucketAmount) * (BigInt(10) ** BigInt(config.decimals));
        tx3.add(createMintToInstruction(mint, ata, payer, rawAmount, [], TOKEN_2022_PROGRAM_ID));
        hasTx3Actions = true;
      } catch (e: any) {
        onProgress(`⚠ Skipping ${bucket.name}: ${e.message}`);
      }
    }

    if (config.multiSigAddress) {
      onProgress('Queueing authority transfer to Multi-Sig...');
      try {
        const multiSig = new PublicKey(config.multiSigAddress);
        tx3.add(createSetAuthorityInstruction(
          mint, payer, AuthorityType.MintTokens, multiSig, [], TOKEN_2022_PROGRAM_ID
        ));
        hasTx3Actions = true;
      } catch {
        onProgress('⚠ Invalid multi-sig address — authority transfer skipped.');
      }
    }

    if (hasTx3Actions) {
      onProgress('Broadcasting Distribution Transaction (TX 3 of 3)...');
      await sendAndConfirm(
        connection, tx3, payer, signTransaction, onProgress, 'Distribution TX'
      );
      onProgress('✓ Supply distributed and authority transferred.');
    }

    onProgress('🚀 Deployment Complete!');
    return { mint: mint.toBase58(), signature: sig1 };

  } catch (err: any) {
    onProgress(`✗ Error: ${err.message}`);
    throw err;
  }
}
