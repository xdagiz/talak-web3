export type Stablecoin = "USDC" | "USDT" | "DAI";
export type ChainKey = "ethereum" | "polygon" | "arbitrum" | "base" | "optimism";

export interface ChainInfo {
  key: ChainKey;
  name: string;
  chainId: number;
  explorer: string;
  rpcUrl: string;
  nativeSymbol: string;
}

export const CHAIN_INFO: Record<ChainKey, ChainInfo> = {
  ethereum: { key: "ethereum", name: "Ethereum", chainId: 1,     explorer: "https://etherscan.io",        rpcUrl: "https://cloudflare-eth.com",   nativeSymbol: "ETH"   },
  polygon:  { key: "polygon",  name: "Polygon",  chainId: 137,   explorer: "https://polygonscan.com",     rpcUrl: "https://polygon-rpc.com",      nativeSymbol: "MATIC" },
  arbitrum: { key: "arbitrum", name: "Arbitrum", chainId: 42161, explorer: "https://arbiscan.io",         rpcUrl: "https://arb1.arbitrum.io/rpc", nativeSymbol: "ETH"   },
  base:     { key: "base",     name: "Base",     chainId: 8453,  explorer: "https://basescan.org",        rpcUrl: "https://mainnet.base.org",     nativeSymbol: "ETH"   },
  optimism: { key: "optimism", name: "Optimism", chainId: 10,    explorer: "https://optimistic.etherscan.io", rpcUrl: "https://mainnet.optimism.io", nativeSymbol: "ETH" },
};

/**
 * Real on-chain ERC-20 contract addresses + decimals for each (coin, chain) pair.
 * Sources: official issuer documentation. Verified against the canonical contracts
 * on each chain's block explorer.
 */
export const TOKEN_ADDRESSES: Record<Stablecoin, Partial<Record<ChainKey, { address: string; decimals: number }>>> = {
  USDC: {
    ethereum: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    polygon:  { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
    arbitrum: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    base:     { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    optimism: { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
  },
  USDT: {
    ethereum: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    polygon:  { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    arbitrum: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    optimism: { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    // No canonical USDT on Base — fallback handled in UI
  },
  DAI: {
    ethereum: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
    polygon:  { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
    arbitrum: { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    base:     { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
    optimism: { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
  },
};

export function getTokenInfo(coin: Stablecoin, chain: ChainKey): { address: string; decimals: number } | null {
  return TOKEN_ADDRESSES[coin][chain] ?? null;
}

/**
 * Encodes a call to ERC-20 `transfer(address recipient, uint256 amount)`.
 * Returns hex calldata suitable for `eth_sendTransaction`'s `data` field.
 */
export function encodeErc20Transfer(recipient: string, amount: bigint): `0x${string}` {
  // function selector for transfer(address,uint256) = keccak256("transfer(address,uint256)")[:4]
  const selector = "a9059cbb";
  const cleanAddr = recipient.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(cleanAddr)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }
  // pad address to 32 bytes
  const paddedAddr = cleanAddr.padStart(64, "0");
  // encode amount as 32-byte big-endian uint256
  const amountHex = amount.toString(16).padStart(64, "0");
  if (amountHex.length > 64) throw new Error("Amount overflow");
  return `0x${selector}${paddedAddr}${amountHex}`;
}

/**
 * Converts a decimal price like 29 (USD) into the smallest token unit
 * (e.g. 29_000_000n for a 6-decimal stablecoin).
 */
export function toTokenUnits(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
  // Use string math to avoid float drift on values like 29.99
  const [whole, frac = ""] = amount.toString().split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
  return BigInt(combined || "0");
}

export function explorerTxUrl(chain: ChainKey, hash: string): string {
  return `${CHAIN_INFO[chain].explorer}/tx/${hash}`;
}

export const CHAIN_LIST: ChainInfo[] = Object.values(CHAIN_INFO);
