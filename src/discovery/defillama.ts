import axios from "axios";
import { config } from "../config.js";

const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

// DefiLlama pool response type
interface DefiLlamaPool {
  pool: string; // Unique pool ID
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number | null;
  rewardTokens: string[] | null;
  underlyingTokens: string[] | null;
  poolMeta: string | null;
  il7d: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  volumeUsd7d: number | null;
  apyBaseInception: number | null;
}

interface DefiLlamaResponse {
  status: string;
  data: DefiLlamaPool[];
}

// Normalized pool data for our system
export interface DiscoveredPool {
  defillamaPoolId: string;
  contractAddress: string;
  name: string;
  protocol: string;
  underlyingSymbol: string;
  underlyingToken: string;
  poolType: "lending" | "vault";
  currentApy: number;
  currentTvl: number;
}

// Map DefiLlama project names to our protocol names
const PROTOCOL_MAP: Record<string, string> = {
  "aave-v3": "aave_v3",
  "compound-v3": "compound_v3",
  "radiant-v2": "radiant_v2",
  morpho: "morpho",
  "morpho-blue": "morpho",
  "yearn-v3": "yearn_v3",
  "yearn-finance": "yearn_v3",
  silo: "silo",
  "silo-finance": "silo",
};

// Known protocol pool addresses on Arbitrum
// For lending protocols, the "pool" is the main contract that we call
const KNOWN_POOL_ADDRESSES: Record<string, string> = {
  "aave-v3": config.protocols.aave_v3.poolAddress,
  "compound-v3": config.protocols.compound_v3.cometAddress,
  // TODO: Radiant V2 needs different address/ABI - disabled for now
  // "radiant-v2": config.protocols.radiant_v2.poolAddress,
};

// Stablecoins we want to track (normalized to uppercase)
const STABLECOIN_SYMBOLS = ["USDC", "USDT", "DAI", "FRAX", "LUSD"];

// Map various symbol representations to our standard symbol
const SYMBOL_NORMALIZATION: Record<string, string> = {
  "USDC": "USDC",
  "USDC.E": "USDC.e",
  "USDCE": "USDC.e",
  "USDC.e": "USDC.e",
  "USDT": "USDT",
  "DAI": "DAI",
  "FRAX": "FRAX",
  "LUSD": "LUSD",
};

/**
 * Get the underlying token address for a stablecoin symbol
 */
function getUnderlyingTokenAddress(symbol: string, defillamaTokens: string[] | null): string | null {
  // First try to get from our config
  const normalizedSymbol = SYMBOL_NORMALIZATION[symbol.toUpperCase()] || symbol.toUpperCase();
  const fromConfig = config.stablecoins[normalizedSymbol];
  if (fromConfig) return fromConfig;

  // Fallback: use DefiLlama's underlyingTokens if available
  if (defillamaTokens && defillamaTokens.length > 0) {
    // Return the first token that looks like an address
    const addr = defillamaTokens.find(t => t.startsWith("0x") && t.length === 42);
    if (addr) return addr;
  }

  return null;
}

/**
 * Determine the contract address for a pool
 * For lending protocols: pool address + underlying token
 * For vaults: the vault address itself
 */
function getContractAddress(
  project: string,
  symbol: string,
  poolId: string,
  underlyingTokens: string[] | null
): string | null {
  const projectLower = project.toLowerCase();

  // For known lending protocols, use their pool addresses
  if (KNOWN_POOL_ADDRESSES[projectLower]) {
    return KNOWN_POOL_ADDRESSES[projectLower];
  }

  // For vaults/other protocols, try to extract address from:
  // 1. Pool ID (some have format: chain-project-0xaddress)
  const poolIdParts = poolId.split("-");
  const addressFromId = poolIdParts.find(part => part.startsWith("0x") && part.length >= 40);
  if (addressFromId) {
    // Clean up the address (might have extra chars)
    return addressFromId.slice(0, 42);
  }

  // 2. Some protocols put the vault address in underlyingTokens[0]
  // (This is not ideal but works for some ERC-4626 vaults)
  
  return null;
}

/**
 * Check if a symbol represents a single stablecoin (not an LP pair)
 */
function isSingleStablecoin(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  
  // Skip if it contains LP indicators
  if (upper.includes("/") || upper.includes("-LP") || upper.includes("LP-")) {
    return false;
  }

  // Skip multi-asset pools (e.g., "USDC-ETH", "WETH-USDC")
  const parts = upper.split(/[-\s]/);
  if (parts.length > 1) {
    // Check if ALL parts are stablecoins (e.g., "USDC-USDT" is OK)
    const allStable = parts.every(p => 
      STABLECOIN_SYMBOLS.includes(p) || 
      p === "USDC.E" || p === "USDCE"
    );
    if (!allStable) return false;
  }

  // Must contain at least one stablecoin
  return STABLECOIN_SYMBOLS.some(stable => 
    upper === stable || 
    upper === stable + ".E" ||
    upper.startsWith(stable)
  );
}

/**
 * Extract the primary stablecoin symbol from a pool symbol
 */
function extractStablecoinSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  
  // Direct match
  for (const stable of STABLECOIN_SYMBOLS) {
    if (upper === stable || upper === stable + ".E") {
      return SYMBOL_NORMALIZATION[upper] || stable;
    }
  }

  // Extract from compound symbols
  const parts = upper.split(/[-\s]/);
  for (const part of parts) {
    if (STABLECOIN_SYMBOLS.includes(part)) {
      return SYMBOL_NORMALIZATION[part] || part;
    }
    if (part === "USDC.E" || part === "USDCE") {
      return "USDC.e";
    }
  }

  return upper;
}

/**
 * Fetch all Arbitrum stablecoin lending/vault pools from DefiLlama
 */
export async function fetchArbitrumPools(): Promise<DiscoveredPool[]> {
  console.log("📡 Fetching pools from DefiLlama...");

  const response = await axios.get<DefiLlamaResponse>(DEFILLAMA_YIELDS_URL);

  if (response.data.status !== "success") {
    throw new Error("DefiLlama API returned non-success status");
  }

  const pools = response.data.data;
  console.log(`   Found ${pools.length} total pools`);

  // Filter for Arbitrum only
  const arbitrumPools = pools.filter((p) => p.chain.toLowerCase() === "arbitrum");
  console.log(`   ${arbitrumPools.length} pools on Arbitrum`);

  // Filter for known lending protocols we support
  const supportedProjects = Object.keys(PROTOCOL_MAP);
  
  const relevantPools = arbitrumPools.filter((pool) => {
    const projectLower = pool.project.toLowerCase();
    
    // Must be a supported protocol
    if (!supportedProjects.includes(projectLower)) {
      return false;
    }

    // Must be a single stablecoin pool (not LP)
    if (!isSingleStablecoin(pool.symbol)) {
      return false;
    }

    // Must have valid APY
    if (pool.apy === null || pool.apy < 0) {
      return false;
    }

    // Must have reasonable TVL (at least $10k)
    if (pool.tvlUsd < 10000) {
      return false;
    }

    return true;
  });

  console.log(`   ${relevantPools.length} supported stablecoin pools`);

  // Transform to our format
  const discoveredPools: DiscoveredPool[] = [];

  for (const pool of relevantPools) {
    const projectLower = pool.project.toLowerCase();
    const underlyingSymbol = extractStablecoinSymbol(pool.symbol);
    
    // Get contract address
    const contractAddress = getContractAddress(
      pool.project,
      pool.symbol,
      pool.pool,
      pool.underlyingTokens
    );

    // Get underlying token address
    const underlyingToken = getUnderlyingTokenAddress(underlyingSymbol, pool.underlyingTokens);

    // Skip if we couldn't resolve addresses
    if (!contractAddress) {
      console.log(`   ⚠️ No pool contract for ${pool.project} ${pool.symbol}, skipping`);
      continue;
    }

    if (!underlyingToken) {
      console.log(`   ⚠️ No underlying token for ${pool.project} ${pool.symbol}, skipping`);
      continue;
    }

    // Determine pool type
    const isLending = ["aave-v3", "compound-v3", "radiant-v2", "silo", "silo-finance"].includes(projectLower);

    discoveredPools.push({
      defillamaPoolId: pool.pool,
      contractAddress,
      name: `${pool.project} ${pool.symbol}`,
      protocol: PROTOCOL_MAP[projectLower] || "unknown",
      underlyingSymbol,
      underlyingToken,
      poolType: isLending ? "lending" : "vault",
      currentApy: pool.apy || 0,
      currentTvl: pool.tvlUsd,
    });

    console.log(`   ✅ ${pool.project} ${pool.symbol}: ${(pool.apy || 0).toFixed(2)}% APY`);
  }

  return discoveredPools;
}

/**
 * Get specific pool details by DefiLlama pool ID
 */
export async function fetchPoolById(poolId: string): Promise<DefiLlamaPool | null> {
  const response = await axios.get<DefiLlamaResponse>(DEFILLAMA_YIELDS_URL);

  if (response.data.status !== "success") {
    return null;
  }

  return response.data.data.find((p) => p.pool === poolId) || null;
}
