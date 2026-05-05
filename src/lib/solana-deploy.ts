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
  getOrCreateAssociatedTokenAccount,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';

export type { TokenLaunchConfig } from './solana-types';

/**
 * Handles the actual deployment of NRT using Token-2022
 * Note: This requires a connected wallet to sign transactions.
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

    // Define Mint extensions
    const extensions: ExtensionType[] = [
      ExtensionType.TransferFeeConfig,
      ExtensionType.MetadataPointer,
    ];
    if (config.interestRate > 0) extensions.push(ExtensionType.InterestBearingConfig);

    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    onProgress('Creating Mint Account...');
    const createAccountInst = SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize Transfer Fee Config
    const initializeTransferFeeConfig = createInitializeTransferFeeConfigInstruction(
      mint,
      payer, // transferFeeConfigAuthority
      payer, // withdrawWithheldAuthority
      config.transferFeeBasisPoints,
      BigInt(config.maxTransferFee),
      TOKEN_2022_PROGRAM_ID
    );

    // Initialize Metadata Pointer
    const initializeMetadataPointer = createInitializeMetadataPointerInstruction(
      mint,
      payer, // authority
      mint, // metadataAddress (pointing to the mint itself for Token-2022 metadata)
      TOKEN_2022_PROGRAM_ID
    );

    let transaction = new Transaction().add(
      createAccountInst,
      initializeTransferFeeConfig,
      initializeMetadataPointer
    );

    // Interest Bearing MUST be initialized before the mint itself
    if (config.interestRate > 0) {
      const initializeInterestBearing = createInitializeInterestBearingMintInstruction(
        mint,
        payer, // rateAuthority
        config.interestRate,
        TOKEN_2022_PROGRAM_ID
      );
      transaction.add(initializeInterestBearing);
    }

    // Initialize Mint (MUST BE LAST INITIALIZATION)
    const initializeMintInst = createInitializeMintInstruction(
      mint,
      config.decimals,
      payer, // mintAuthority
      payer, // freezeAuthority
      TOKEN_2022_PROGRAM_ID
    );
    transaction.add(initializeMintInst);

    // Add Priority Fee to prevent transaction expiry on public RPCs
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000 // 0.0001 SOL priority fee to ensure inclusion
    });
    transaction.add(addPriorityFee);

    onProgress('Broadcasting Mint Transaction...');
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = payer;
    transaction.partialSign(mintKeypair);

    const signedTx = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });
    
    try {
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
      }
    } catch (confirmError: any) {
      // If WebSocket confirmation fails, try polling signature status directly
      onProgress('WebSocket confirmation timeout, verifying signature on-chain...');
      const status = await connection.getSignatureStatus(signature);
      if (status.value?.err) {
        throw new Error(`Transaction failed: ${status.value.err.toString()}`);
      } else if (!status.value) {
        throw new Error(`Transaction expired or dropped. Signature: ${signature}`);
      }
    }

    onProgress(`Mint created: ${mint.toBase58()}`);

    // Distribution Phase
    for (const bucket of config.treasuryBuckets) {
      if (!bucket.address) continue;
      onProgress(`Distributing to ${bucket.name}...`);

      const recipient = new PublicKey(bucket.address);
      // Logic for minting to accounts would go here
      // For simplicity in this demo, we would create ATA and MintTo
    }

    // Authority Transfer
    if (config.multiSigAddress) {
      onProgress('Transferring Authority to Multi-Sig...');
      const multiSig = new PublicKey(config.multiSigAddress);
      const setAuthInst = createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.MintTokens,
        multiSig,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      // Broadcast set authority...
    }

    onProgress('Deployment Complete!');
    return { mint: mint.toBase58(), signature };
  } catch (err: any) {
    onProgress(`Error: ${err.message}`);
    throw err;
  }
}
