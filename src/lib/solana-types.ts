/**
 * Shared types for Solana token deployment.
 * Kept separate from solana-deploy.ts to avoid browser import resolution issues
 * with Node.js-specific Solana libraries during development.
 */
export interface TokenLaunchConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  transferFeeBasisPoints: number;
  maxTransferFee: number;
  interestRate: number;
  treasuryBuckets: { name: string; address: string; allocation: number }[];
  multiSigAddress?: string;
}
