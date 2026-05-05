/**
 * NRT Token Metadata Generator
 * Generates a standard SPL Token-2022 metadata JSON compatible with Metaplex.
 */
export function generateNRTMetadata(logoUrl: string) {
  return {
    name: "NetReward Token",
    symbol: "NRT",
    description: "NetReward Token (NRT) is the foundational asset for the NetReward ecosystem. It incentivizes high-quality network connectivity and powers decentralized rewards for SPs, ISPs, and users worldwide.",
    image: logoUrl || "https://pmpeyfkbqipfnhokfksl.supabase.co/storage/v1/object/public/assets/nrt-logo.png",
    attributes: [
      {
        trait_type: "Standard",
        value: "Token-2022"
      },
      {
        trait_type: "Utility",
        value: "Connectivity Rewards"
      }
    ],
    properties: {
      files: [
        {
          uri: logoUrl,
          type: "image/png"
        }
      ],
      category: "image",
      links: {
        website: "https://netreward.online",
        docs: "https://docs.netreward.online"
      }
    }
  };
}

/**
 * Example usage:
 * const metadata = generateNRTMetadata(logoUrl);
 * const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
 * // Upload blob to IPFS/Arweave...
 */
